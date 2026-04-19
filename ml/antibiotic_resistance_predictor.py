"""
Antibiotic Resistance Prediction from Genomic Data
====================================================
Predicts antibiotic resistance (Ciprofloxacin, Amoxicillin, Rifampicin)
from genomic FASTA files using k-mer (k=5) feature extraction.

Models: Random Forest Classifier, Logistic Regression
Data Sources: BV-BRC, NCBI, PATRIC databases

Usage:
    python antibiotic_resistance_predictor.py --csv labels.csv --fasta_dir ./fasta_files
    python antibiotic_resistance_predictor.py --csv labels.csv --fasta_dir ./fasta_files --antibiotic Ciprofloxacin
"""

import os
import sys
import argparse
import logging
import time
from itertools import product
from collections import Counter
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
import joblib

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
K = 5  # k-mer length
NUCLEOTIDES = ["A", "C", "G", "T"]
ALL_KMERS: List[str] = sorted(["".join(combo) for combo in product(NUCLEOTIDES, repeat=K)])
KMER_INDEX: Dict[str, int] = {kmer: idx for idx, kmer in enumerate(ALL_KMERS)}
NUM_KMERS = len(ALL_KMERS)  # 4^5 = 1024

SUPPORTED_ANTIBIOTICS = ["Ciprofloxacin", "Amoxicillin", "Rifampicin"]
RANDOM_STATE = 42
TEST_SIZE = 0.20


# ============================================================================
# 1. FASTA PARSING
# ============================================================================
def parse_fasta(filepath: str) -> str:
    """
    Parse a FASTA file and return the concatenated sequence (uppercase).
    Handles multi-record FASTA files by joining all sequences.
    """
    sequences: List[str] = []
    current_seq: List[str] = []

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                if line.startswith(">"):
                    if current_seq:
                        sequences.append("".join(current_seq))
                        current_seq = []
                else:
                    # Keep only valid nucleotide characters
                    cleaned = "".join(ch for ch in line.upper() if ch in "ACGT")
                    current_seq.append(cleaned)
            if current_seq:
                sequences.append("".join(current_seq))
    except FileNotFoundError:
        logger.error(f"FASTA file not found: {filepath}")
        return ""
    except Exception as exc:
        logger.error(f"Error reading {filepath}: {exc}")
        return ""

    return "".join(sequences)


# ============================================================================
# 2. K-MER FEATURE EXTRACTION
# ============================================================================
def extract_kmer_features(sequence: str, k: int = K) -> np.ndarray:
    """
    Extract normalized k-mer frequency vector from a DNA sequence.

    Parameters
    ----------
    sequence : str
        Concatenated DNA sequence (uppercase, ACGT only).
    k : int
        Length of each k-mer (default 5).

    Returns
    -------
    np.ndarray
        Fixed-length vector of size 4^k with normalized k-mer frequencies.
    """
    feature_vector = np.zeros(NUM_KMERS, dtype=np.float64)

    if len(sequence) < k:
        logger.warning(f"Sequence too short ({len(sequence)} bp) for k={k}. Returning zero vector.")
        return feature_vector

    # Count k-mers using a sliding window
    kmer_counts: Counter = Counter()
    for i in range(len(sequence) - k + 1):
        kmer = sequence[i : i + k]
        if kmer in KMER_INDEX:
            kmer_counts[kmer] += 1

    total_kmers = sum(kmer_counts.values())

    if total_kmers == 0:
        logger.warning("No valid k-mers found. Returning zero vector.")
        return feature_vector

    # Populate and normalize
    for kmer, count in kmer_counts.items():
        feature_vector[KMER_INDEX[kmer]] = count / total_kmers

    return feature_vector


def build_feature_matrix(
    fasta_dir: str, sample_ids: List[str], filenames: List[str]
) -> Tuple[np.ndarray, List[str]]:
    """
    Build the feature matrix X from a list of FASTA files.

    Returns
    -------
    X : np.ndarray of shape (n_samples, 1024)
    valid_ids : list of sample IDs that were successfully processed
    """
    X_list: List[np.ndarray] = []
    valid_ids: List[str] = []

    total = len(filenames)
    for idx, (sid, fname) in enumerate(zip(sample_ids, filenames), start=1):
        filepath = os.path.join(fasta_dir, fname)

        if not os.path.isfile(filepath):
            logger.warning(f"[{idx}/{total}] Skipping missing file: {filepath}")
            continue

        logger.info(f"[{idx}/{total}] Processing {fname} ...")
        sequence = parse_fasta(filepath)

        if not sequence:
            logger.warning(f"  -> Empty sequence, skipping.")
            continue

        features = extract_kmer_features(sequence)
        X_list.append(features)
        valid_ids.append(sid)

    if not X_list:
        logger.error("No valid samples were processed. Exiting.")
        sys.exit(1)

    X = np.vstack(X_list)
    logger.info(f"Feature matrix shape: {X.shape}  ({X.shape[0]} samples × {X.shape[1]} features)")
    return X, valid_ids


# ============================================================================
# 3. LABEL LOADING
# ============================================================================
def load_labels(csv_path: str, antibiotic: Optional[str] = None) -> pd.DataFrame:
    """
    Load the labels CSV.

    Expected CSV columns (minimum):
        - sample_id   : unique identifier matching FASTA filename stem
        - fasta_file  : filename of the FASTA file (e.g. sample001.fasta)
        - antibiotic  : name of the antibiotic tested
        - resistance  : label — 'Resistant' or 'Susceptible'

    If `antibiotic` is specified, filters to that antibiotic only.
    """
    logger.info(f"Loading labels from: {csv_path}")
    df = pd.read_csv(csv_path)

    required_cols = {"sample_id", "fasta_file", "antibiotic", "resistance"}
    missing = required_cols - set(df.columns)
    if missing:
        logger.error(
            f"CSV is missing required columns: {missing}\n"
            f"Expected columns: {required_cols}\n"
            f"Found columns: {set(df.columns)}"
        )
        sys.exit(1)

    # Normalize label values
    df["resistance"] = df["resistance"].str.strip().str.capitalize()

    if antibiotic:
        df = df[df["antibiotic"].str.strip().str.lower() == antibiotic.strip().lower()]
        if df.empty:
            logger.error(f"No samples found for antibiotic: {antibiotic}")
            sys.exit(1)
        logger.info(f"Filtered to antibiotic '{antibiotic}': {len(df)} samples")

    logger.info(f"Label distribution:\n{df['resistance'].value_counts().to_string()}")
    return df


# ============================================================================
# 4. MODEL TRAINING & EVALUATION
# ============================================================================
def get_models() -> Dict[str, object]:
    """Return a dictionary of model name → configured estimator."""
    return {
        "Random Forest": RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            class_weight="balanced",
        ),
        "Logistic Regression": LogisticRegression(
            C=1.0,
            max_iter=1000,
            random_state=RANDOM_STATE,
            solver="lbfgs",
            class_weight="balanced",
        ),
    }


def evaluate_model(
    model, X_test: np.ndarray, y_test: np.ndarray, model_name: str
) -> Dict[str, float]:
    """
    Evaluate a trained model on the test set.

    Returns a dict with accuracy, precision, recall, f1.
    """
    y_pred = model.predict(X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, average="weighted", zero_division=0),
        "recall": recall_score(y_test, y_pred, average="weighted", zero_division=0),
        "f1_score": f1_score(y_test, y_pred, average="weighted", zero_division=0),
    }

    logger.info(f"\n{'='*60}")
    logger.info(f"  {model_name} — Evaluation Results")
    logger.info(f"{'='*60}")
    logger.info(f"  Accuracy  : {metrics['accuracy']:.4f}")
    logger.info(f"  Precision : {metrics['precision']:.4f}")
    logger.info(f"  Recall    : {metrics['recall']:.4f}")
    logger.info(f"  F1-Score  : {metrics['f1_score']:.4f}")
    logger.info(f"\n  Classification Report:\n{classification_report(y_test, y_pred, zero_division=0)}")
    logger.info(f"  Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")

    return metrics


def train_and_evaluate(
    X_train: np.ndarray,
    X_test: np.ndarray,
    y_train: np.ndarray,
    y_test: np.ndarray,
) -> Tuple[str, object, Dict[str, float]]:
    """
    Train all models, evaluate them, and return the best one.

    Returns
    -------
    best_name : str
    best_model : trained estimator
    best_metrics : dict of metric values
    """
    models = get_models()
    results: Dict[str, Dict] = {}

    for name, model in models.items():
        logger.info(f"\n>>> Training {name} ...")
        start = time.time()
        model.fit(X_train, y_train)
        elapsed = time.time() - start
        logger.info(f"    Training completed in {elapsed:.2f}s")

        # Optional: cross-validation score on training data
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="f1_weighted", n_jobs=-1)
        logger.info(f"    5-Fold CV F1 (train): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

        metrics = evaluate_model(model, X_test, y_test, name)
        results[name] = {"model": model, "metrics": metrics}

    # Determine best model by F1-score
    best_name = max(results, key=lambda n: results[n]["metrics"]["f1_score"])
    best_model = results[best_name]["model"]
    best_metrics = results[best_name]["metrics"]

    logger.info(f"\n{'*'*60}")
    logger.info(f"  🏆  Best Model: {best_name}  (F1 = {best_metrics['f1_score']:.4f})")
    logger.info(f"{'*'*60}")

    return best_name, best_model, best_metrics, results


# ============================================================================
# 5. MODEL PERSISTENCE
# ============================================================================
def save_model(model, scaler, label_encoder, model_name: str, output_dir: str, antibiotic: str):
    """Save the trained model, scaler, and label encoder to disk."""
    os.makedirs(output_dir, exist_ok=True)

    safe_antibiotic = antibiotic.lower().replace(" ", "_") if antibiotic else "all"
    safe_model_name = model_name.lower().replace(" ", "_")

    model_path = os.path.join(output_dir, f"best_model_{safe_antibiotic}_{safe_model_name}.joblib")
    scaler_path = os.path.join(output_dir, f"scaler_{safe_antibiotic}.joblib")
    encoder_path = os.path.join(output_dir, f"label_encoder_{safe_antibiotic}.joblib")

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(label_encoder, encoder_path)

    logger.info(f"Model saved  : {model_path}")
    logger.info(f"Scaler saved : {scaler_path}")
    logger.info(f"Encoder saved: {encoder_path}")

    return model_path


# ============================================================================
# 6. MAIN PIPELINE
# ============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Predict antibiotic resistance from genomic FASTA data using k-mer features.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python antibiotic_resistance_predictor.py --csv labels.csv --fasta_dir ./fasta_files
  python antibiotic_resistance_predictor.py --csv labels.csv --fasta_dir ./fasta_files --antibiotic Ciprofloxacin
  python antibiotic_resistance_predictor.py --csv labels.csv --fasta_dir ./fasta_files --output_dir ./models
        """,
    )
    parser.add_argument("--csv", required=True, help="Path to the labels CSV file.")
    parser.add_argument("--fasta_dir", required=True, help="Directory containing FASTA files.")
    parser.add_argument(
        "--antibiotic",
        default=None,
        choices=SUPPORTED_ANTIBIOTICS,
        help="Filter to a specific antibiotic. If omitted, uses all samples.",
    )
    parser.add_argument(
        "--output_dir",
        default="./saved_models",
        help="Directory to save the best model (default: ./saved_models).",
    )

    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("  Antibiotic Resistance Predictor — Pipeline Start")
    logger.info("=" * 60)
    logger.info(f"  CSV file    : {args.csv}")
    logger.info(f"  FASTA dir   : {args.fasta_dir}")
    logger.info(f"  Antibiotic  : {args.antibiotic or 'ALL'}")
    logger.info(f"  k-mer size  : {K}")
    logger.info(f"  Feature dim : {NUM_KMERS}")
    logger.info(f"  Test split  : {TEST_SIZE*100:.0f}%")
    logger.info("=" * 60)

    # ---- Step 1: Load labels ----
    df = load_labels(args.csv, antibiotic=args.antibiotic)

    # ---- Step 2: Build feature matrix ----
    # NOTE: A single genome (fasta_file) may appear in multiple rows
    # (tested against different antibiotics). We cache parsed features
    # per-file to avoid redundant I/O, but produce one feature row
    # per CSV row so X and y stay aligned.
    feature_cache: Dict[str, Optional[np.ndarray]] = {}
    X_list: List[np.ndarray] = []
    y_labels: List[str] = []
    valid_indices: List[int] = []

    total = len(df)
    for row_idx, (_, row) in enumerate(df.iterrows(), start=1):
        fname = row["fasta_file"]

        if fname not in feature_cache:
            filepath = os.path.join(args.fasta_dir, fname)
            if not os.path.isfile(filepath):
                logger.warning(f"[{row_idx}/{total}] Skipping missing file: {filepath}")
                feature_cache[fname] = None
                continue
            logger.info(f"[{row_idx}/{total}] Processing {fname} ...")
            sequence = parse_fasta(filepath)
            if not sequence:
                logger.warning(f"  -> Empty sequence, skipping.")
                feature_cache[fname] = None
                continue
            feature_cache[fname] = extract_kmer_features(sequence)
        else:
            if feature_cache[fname] is not None:
                logger.info(f"[{row_idx}/{total}] Processing {fname} ... [cached]")

        features = feature_cache[fname]
        if features is None:
            continue

        X_list.append(features)
        y_labels.append(row["resistance"])

    if not X_list:
        logger.error("No valid samples were processed. Exiting.")
        sys.exit(1)

    X = np.vstack(X_list)
    logger.info(f"Feature matrix shape: {X.shape}  ({X.shape[0]} samples × {X.shape[1]} features)")

    # Encode labels
    le = LabelEncoder()
    y = le.fit_transform(y_labels)
    logger.info(f"Label classes: {list(le.classes_)}")
    logger.info(f"X samples: {X.shape[0]}, y samples: {len(y)}")

    # ---- Step 3: Train/Test split ----
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    logger.info(f"Train set: {X_train.shape[0]} samples | Test set: {X_test.shape[0]} samples")

    # ---- Step 4: Standardize features ----
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # ---- Step 5: Train & Evaluate ----
    best_name, best_model, best_metrics, all_results = train_and_evaluate(
        X_train, X_test, y_train, y_test
    )

    # ---- Step 6: Save best model ----
    antibiotic_tag = args.antibiotic or "all_antibiotics"
    model_path = save_model(best_model, scaler, le, best_name, args.output_dir, antibiotic_tag)

    # ---- Summary ----
    logger.info(f"\n{'='*60}")
    logger.info("  Pipeline Complete — Summary")
    logger.info(f"{'='*60}")
    logger.info(f"  Total samples processed : {X.shape[0]}")
    logger.info(f"  Feature dimensions      : {X.shape[1]}")
    logger.info(f"  Best model              : {best_name}")
    logger.info(f"  Best F1-score           : {best_metrics['f1_score']:.4f}")
    logger.info(f"  Model saved to          : {model_path}")
    logger.info(f"{'='*60}")

    # Print comparison table
    print("\n" + "=" * 70)
    print(f"{'Model':<25} {'Accuracy':>10} {'Precision':>10} {'Recall':>10} {'F1-Score':>10}")
    print("-" * 70)
    for name, data in all_results.items():
        m = data["metrics"]
        marker = " *BEST*" if name == best_name else ""
        print(
            f"{name:<25} {m['accuracy']:>10.4f} {m['precision']:>10.4f} "
            f"{m['recall']:>10.4f} {m['f1_score']:>10.4f}{marker}"
        )
    print("=" * 70)
    print(f"*BEST* = Best model (saved to {model_path})\n")


if __name__ == "__main__":
    main()
