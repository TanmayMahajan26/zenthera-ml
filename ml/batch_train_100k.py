"""
Zenthera — Large-Scale Genomic Training Pipeline
==================================================
Downloads up to 100,000 FASTA files from BV-BRC and NCBI, extracts k-mer
features in memory-efficient batches (deleting raw files after each batch),
and trains per-antibiotic resistance prediction models targeting 85-90%+
accuracy.

Designed to operate within 100 GB of disk space.

Output:
  ./trained_models/
      model_<antibiotic>.joblib       — best sklearn/xgb model per antibiotic
      scaler_<antibiotic>.joblib      — StandardScaler per antibiotic
      training_manifest.json          — metadata: which antibiotics, accuracy, etc.

Usage:
    python batch_train_100k.py                              # full run
    python batch_train_100k.py --target 100000              # explicit target
    python batch_train_100k.py --test_run                   # quick 200-sample test
    python batch_train_100k.py --resume                     # resume interrupted run
    python batch_train_100k.py --skip_download --train_only # retrain from cached features
"""

import os
import sys
import csv
import json
import time
import shutil
import argparse
import logging
import random
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, List, Optional, Tuple
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
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

# Optional GPU-accelerated XGBoost
try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

# Shared feature extraction
from kmer_utils import (
    parse_fasta,
    extract_features,
    NUM_TOTAL_FEATURES,
    K,
)

# ---------------------------------------------------------------------------
# Logging — force flush so output appears in real-time
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    force=True,
)
logger = logging.getLogger(__name__)
# Force stderr flush after every log message
for handler in logging.root.handlers:
    handler.flush = lambda: sys.stderr.flush()

# ---------------------------------------------------------------------------
# API Constants
# ---------------------------------------------------------------------------
BVBRC_API_BASE = "https://www.bv-brc.org/api"
NCBI_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
NCBI_EFETCH  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
NCBI_EMAIL   = "zenthera_research@example.com"

# Rate-limit delays (seconds)
BVBRC_DELAY = 0.35
NCBI_DELAY  = 0.40

# Retry
MAX_RETRIES = 3
RETRY_DELAY = 5

# Antibiotics to query (user's primary 4 targets)
ANTIBIOTICS = [
    "azithromycin",
    "amoxicillin",
    "ofloxacin",
    "cefixime",
]

PHENOTYPES = ["Resistant", "Susceptible"]

# NCBI targeted search terms — focused on user's 4 antibiotics
NCBI_SEARCH_TERMS = {
    "azithromycin": {
        "Resistant": (
            '("bacteria"[Organism]) '
            'AND (ermA OR ermB OR ermC OR mefA OR "macrolide resistance" OR "azithromycin resistant") '
            'AND "complete genome"[Title]'
        ),
        "Susceptible": (
            '("Escherichia coli"[Organism] OR "Staphylococcus"[Organism] OR "Streptococcus"[Organism]) '
            'AND "complete genome"[Title] '
            'NOT "macrolide resistance" NOT "azithromycin"'
        ),
    },
    "amoxicillin": {
        "Resistant": (
            '("Escherichia coli"[Organism] OR "Staphylococcus aureus"[Organism] OR "Helicobacter pylori"[Organism]) '
            'AND (blaTEM OR blaSHV OR blaOXA OR "beta-lactamase" OR "amoxicillin resistant") '
            'AND "complete genome"[Title]'
        ),
        "Susceptible": (
            '("Escherichia coli"[Organism] OR "Streptococcus"[Organism]) '
            'AND "complete genome"[Title] '
            'NOT blaTEM NOT blaSHV NOT "beta-lactamase" NOT "amoxicillin resistant"'
        ),
    },
    "ofloxacin": {
        "Resistant": (
            '("bacteria"[Organism]) '
            'AND (gyrA OR gyrB OR parC OR "fluoroquinolone resistance" OR "ofloxacin resistant") '
            'AND "complete genome"[Title]'
        ),
        "Susceptible": (
            '("Escherichia coli"[Organism] OR "Mycobacterium tuberculosis"[Organism]) '
            'AND "complete genome"[Title] '
            'NOT "fluoroquinolone resistance" NOT "ofloxacin"'
        ),
    },
    "cefixime": {
        "Resistant": (
            '("Neisseria gonorrhoeae"[Organism] OR "Escherichia coli"[Organism]) '
            'AND (blaCTX OR blaCMY OR "cephalosporin resistance" OR "cefixime resistant") '
            'AND "complete genome"[Title]'
        ),
        "Susceptible": (
            '("Neisseria gonorrhoeae"[Organism] OR "Escherichia coli"[Organism]) '
            'AND "complete genome"[Title] '
            'NOT "cephalosporin resistance" NOT "cefixime"'
        ),
    },
}


# ============================================================================
# HTTP UTILITIES
# ============================================================================
def http_get(url: str, accept: str = "application/json", timeout: int = 30) -> Optional[bytes]:
    """HTTP GET with retries. Returns raw bytes or None on failure."""
    headers = {"Accept": accept, "User-Agent": "Zenthera-Genomic-Pipeline/2.0"}
    req = urllib.request.Request(url, headers=headers)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            logger.warning(f"  HTTP {e.code} attempt {attempt}/{MAX_RETRIES}")
            if e.code == 429 or e.code >= 500:
                time.sleep(RETRY_DELAY * attempt)
            else:
                return None
        except (urllib.error.URLError, Exception) as e:
            logger.warning(f"  Timeout/Error attempt {attempt}/{MAX_RETRIES}: {e}")
            time.sleep(min(RETRY_DELAY, 2))  # Short retry delay
    return None


def http_get_json(url: str):
    """GET → parsed JSON (list or dict) or None."""
    data = http_get(url, accept="application/json")
    if data is None:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def disk_free_gb(path: str = ".") -> float:
    """Return free disk space in GB."""
    _, _, free = shutil.disk_usage(path)
    return free / (1024 ** 3)


# ============================================================================
# PHASE 1 — METADATA COLLECTION
# ============================================================================
def collect_bvbrc_metadata(per_class_limit: int = 3000) -> List[Dict]:
    """
    Query BV-BRC genome_amr for genome IDs + resistance labels.
    Returns list of dicts: {genome_id, antibiotic, resistance, source}.
    """
    all_records = []
    seen = set()  # (genome_id, antibiotic) pairs to avoid duplicates

    for antibiotic in ANTIBIOTICS:
        for phenotype in PHENOTYPES:
            url = (
                f"{BVBRC_API_BASE}/genome_amr/"
                f"?eq(antibiotic,{urllib.parse.quote(antibiotic)})"
                f"&eq(resistant_phenotype,{urllib.parse.quote(phenotype)})"
                f"&limit({per_class_limit})"
                f"&select(genome_id,genome_name,antibiotic,resistant_phenotype)"
                f"&http_accept=application/json"
            )

            logger.info(f"  BV-BRC: {antibiotic} / {phenotype} (limit={per_class_limit})")
            records = http_get_json(url)
            time.sleep(BVBRC_DELAY)

            if not records:
                logger.warning(f"    → 0 results")
                continue

            added = 0
            for r in records:
                gid = r.get("genome_id")
                if not gid:
                    continue
                key = (gid, antibiotic)
                if key in seen:
                    continue
                seen.add(key)
                all_records.append({
                    "genome_id": gid,
                    "antibiotic": antibiotic.capitalize(),
                    "resistance": phenotype,
                    "source": "BV-BRC",
                })
                added += 1

            logger.info(f"    → {added} new records  (total: {len(all_records)})")

    return all_records


def collect_ncbi_metadata(per_class_limit: int = 1500) -> List[Dict]:
    """
    Query NCBI Nucleotide DB for genome IDs associated with AMR.
    Returns list of dicts.
    """
    all_records = []

    for antibiotic, terms in NCBI_SEARCH_TERMS.items():
        for phenotype in PHENOTYPES:
            query = terms.get(phenotype, "")
            if not query:
                continue

            params = urllib.parse.urlencode({
                "db": "nucleotide",
                "term": query,
                "retmax": per_class_limit,
                "retmode": "json",
                "email": NCBI_EMAIL,
            })
            url = f"{NCBI_ESEARCH}?{params}"

            logger.info(f"  NCBI: {antibiotic} / {phenotype}")
            data = http_get(url)
            time.sleep(NCBI_DELAY)

            if data is None:
                continue

            try:
                result = json.loads(data.decode("utf-8"))
                id_list = result.get("esearchresult", {}).get("idlist", [])
            except (json.JSONDecodeError, KeyError):
                continue

            for ncbi_id in id_list:
                all_records.append({
                    "genome_id": ncbi_id,
                    "antibiotic": antibiotic.capitalize(),
                    "resistance": phenotype,
                    "source": "NCBI",
                })

            logger.info(f"    → {len(id_list)} IDs")

    return all_records


def collect_all_metadata(output_dir: str, bvbrc_limit: int, ncbi_limit: int) -> pd.DataFrame:
    """Collect metadata from both sources, deduplicate, save CSV, return DataFrame."""
    csv_path = os.path.join(output_dir, "master_metadata.csv")

    # If metadata already exists (resume mode), just reload it
    if os.path.isfile(csv_path):
        logger.info(f"  Loading existing metadata from {csv_path}")
        return pd.read_csv(csv_path)

    logger.info("=" * 60)
    logger.info("  PHASE 1: Collecting genome metadata from APIs")
    logger.info("=" * 60)

    records = []

    logger.info("\n>>> Querying BV-BRC ...")
    bvbrc = collect_bvbrc_metadata(per_class_limit=bvbrc_limit)
    records.extend(bvbrc)
    logger.info(f"  BV-BRC total: {len(bvbrc)} records")

    logger.info("\n>>> Querying NCBI ...")
    ncbi = collect_ncbi_metadata(per_class_limit=ncbi_limit)
    records.extend(ncbi)
    logger.info(f"  NCBI total: {len(ncbi)} records")

    if not records:
        logger.error("No metadata collected! Check internet connection.")
        sys.exit(1)

    df = pd.DataFrame(records)
    # Drop exact duplicate rows
    df = df.drop_duplicates(subset=["genome_id", "antibiotic", "resistance"])
    df = df.reset_index(drop=True)

    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Save
    df.to_csv(csv_path, index=False)
    logger.info(f"\n  Metadata saved: {csv_path}  ({len(df)} rows)")

    # Print distribution
    logger.info("\n  Distribution:")
    for ab in sorted(df["antibiotic"].unique()):
        sub = df[df["antibiotic"] == ab]
        r_count = len(sub[sub["resistance"] == "Resistant"])
        s_count = len(sub[sub["resistance"] == "Susceptible"])
        logger.info(f"    {ab:30s}  R={r_count:5d}  S={s_count:5d}  Total={len(sub):5d}")

    return df


# ============================================================================
# PHASE 2 — BATCH DOWNLOAD + FEATURE EXTRACTION
# ============================================================================
def download_fasta(genome_id, source: str, temp_dir: str) -> Optional[str]:
    """Download a single FASTA file. Returns local path or None."""
    genome_id = str(genome_id)  # CSV may read IDs as float/int
    if source == "BV-BRC":
        safe_id = genome_id.replace("/", "_")
        filename = f"BVBRC_{safe_id}.fasta"
        filepath = os.path.join(temp_dir, filename)

        if os.path.isfile(filepath) and os.path.getsize(filepath) > 100:
            return filepath

        url = (
            f"{BVBRC_API_BASE}/genome_sequence/"
            f"?eq(genome_id,{urllib.parse.quote(genome_id)})"
            f"&http_accept=application/dna+fasta"
        )
        data = http_get(url, accept="application/dna+fasta", timeout=30)
        time.sleep(BVBRC_DELAY)

    else:  # NCBI
        filename = f"NCBI_{genome_id}.fasta"
        filepath = os.path.join(temp_dir, filename)

        if os.path.isfile(filepath) and os.path.getsize(filepath) > 100:
            return filepath

        params = urllib.parse.urlencode({
            "db": "nucleotide",
            "id": genome_id,
            "rettype": "fasta",
            "retmode": "text",
            "email": NCBI_EMAIL,
        })
        url = f"{NCBI_EFETCH}?{params}"
        data = http_get(url, accept="text/plain", timeout=30)
        time.sleep(NCBI_DELAY)

    if data is None or len(data) < 50:
        return None

    with open(filepath, "wb") as f:
        f.write(data)
    return filepath


def process_batches(
    metadata: pd.DataFrame,
    output_dir: str,
    batch_size: int = 500,
    target: int = 100_000,
) -> Tuple[Dict[str, np.ndarray], int]:
    """
    Download genomes in batches, extract features, delete FASTA files.

    Saves each batch as batch_XXXX.npz to allow resume.
    Returns a dict mapping genome_id → feature_vector and a count of processed genomes.
    """
    batch_dir = os.path.join(output_dir, "feature_batches")
    temp_dir = os.path.join(output_dir, "temp_fasta")
    os.makedirs(batch_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)

    # Get unique genome IDs (a single genome may be tested against multiple antibiotics)
    unique_genomes = metadata[["genome_id", "source"]].drop_duplicates(subset=["genome_id"])
    unique_list = list(unique_genomes.itertuples(index=False, name=None))  # (genome_id, source)
    random.shuffle(unique_list)

    logger.info("=" * 60)
    logger.info("  PHASE 2: Batch download + feature extraction")
    logger.info("=" * 60)
    logger.info(f"  Unique genomes to process : {len(unique_list)}")
    logger.info(f"  Target                    : {target}")
    logger.info(f"  Batch size                : {batch_size}")
    logger.info(f"  Free disk space           : {disk_free_gb(output_dir):.1f} GB")

    total_processed = 0
    total_failed = 0
    batch_idx = 0
    start_time = time.time()

    # Count already-completed batches for resume
    existing_batches = sorted([
        f for f in os.listdir(batch_dir) if f.startswith("batch_") and f.endswith(".npz")
    ])
    if existing_batches:
        # Load existing to count
        for bf in existing_batches:
            bp = os.path.join(batch_dir, bf)
            try:
                d = np.load(bp, allow_pickle=True)
                total_processed += len(d["genome_ids"])
            except Exception:
                pass
        batch_idx = len(existing_batches)
        logger.info(f"  Resuming: {batch_idx} batches found, {total_processed} genomes cached")

    # Skip genomes already in existing batches
    already_done = set()
    for bf in existing_batches:
        try:
            d = np.load(os.path.join(batch_dir, bf), allow_pickle=True)
            for gid in d["genome_ids"]:
                already_done.add(str(gid))
        except Exception:
            pass

    remaining = [(gid, src) for gid, src in unique_list if gid not in already_done]
    logger.info(f"  Genomes remaining         : {len(remaining)}")

    # Process in batches
    for i in range(0, len(remaining), batch_size):
        if total_processed >= target:
            logger.info(f"  Target of {target} reached!")
            break

        # Check disk space
        free_gb = disk_free_gb(output_dir)
        if free_gb < 5.0:
            logger.warning(f"  Low disk space ({free_gb:.1f} GB). Stopping downloads.")
            break

        batch = remaining[i : i + batch_size]
        batch_idx += 1
        batch_genome_ids = []
        batch_features = []

        logger.info(f"\n  -- Batch {batch_idx} ({len(batch)} genomes, 5 parallel threads) --")

        # --- Parallel download using ThreadPoolExecutor ---
        def _download_and_extract(args_tuple):
            """Download one genome, extract features, delete file. Thread-safe."""
            idx, genome_id, source = args_tuple
            t0 = time.time()
            fasta_path = download_fasta(genome_id, source, temp_dir)
            dl_time = time.time() - t0

            if fasta_path is None:
                return idx, genome_id, source, None, dl_time, "FAIL", 0, 0

            sequence = parse_fasta(fasta_path)
            seq_len = len(sequence) if sequence else 0

            try:
                fasta_size_kb = os.path.getsize(fasta_path) / 1024
                os.remove(fasta_path)
            except OSError:
                fasta_size_kb = 0

            if not sequence or seq_len < 500:
                return idx, genome_id, source, None, dl_time, "SHORT", seq_len, fasta_size_kb

            features = extract_features(sequence)
            if features is None:
                return idx, genome_id, source, None, dl_time, "EXTRACT_FAIL", seq_len, fasta_size_kb

            return idx, genome_id, source, features, dl_time, "OK", seq_len, fasta_size_kb

        tasks = [(j, gid, src) for j, (gid, src) in enumerate(batch)]
        completed_count = 0

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {executor.submit(_download_and_extract, t): t for t in tasks}
            for future in as_completed(futures):
                idx, genome_id, source, features, dl_time, status, seq_len, fsize = future.result()
                completed_count += 1

                if status == "OK" and features is not None:
                    batch_genome_ids.append(genome_id)
                    batch_features.append(features)
                    cur_total = total_processed + len(batch_features)
                    print(
                        f"    [{completed_count}/{len(batch)}] [ OK ]  {source} {genome_id}  "
                        f"{fsize:.0f}KB  {seq_len:,}bp  ({dl_time:.1f}s)  "
                        f"[Total: {cur_total}]",
                        flush=True
                    )
                elif status == "FAIL":
                    total_failed += 1
                    print(f"    [{completed_count}/{len(batch)}] [FAIL]  {source} {genome_id}  ({dl_time:.1f}s)", flush=True)
                elif status == "SHORT":
                    total_failed += 1
                    print(f"    [{completed_count}/{len(batch)}] [SKIP]  {source} {genome_id}  ({seq_len} bp, too short)", flush=True)
                else:
                    total_failed += 1

        # Save batch
        if batch_features:
            batch_file = os.path.join(batch_dir, f"batch_{batch_idx:04d}.npz")
            np.savez_compressed(
                batch_file,
                genome_ids=np.array(batch_genome_ids, dtype=object),
                features=np.array(batch_features, dtype=np.float32),
            )
            total_processed += len(batch_features)
            size_mb = os.path.getsize(batch_file) / (1024 * 1024)
            logger.info(
                f"  Batch {batch_idx} saved: {len(batch_features)} genomes, "
                f"{size_mb:.1f} MB  (Total: {total_processed})"
            )

    # Clean up temp dir
    try:
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass

    elapsed = time.time() - start_time
    logger.info(f"\n  Phase 2 complete: {total_processed} genomes in {elapsed/3600:.1f}h")
    logger.info(f"  Failed downloads: {total_failed}")

    # Load all batches into a single dict: genome_id → features
    genome_features: Dict[str, np.ndarray] = {}
    batch_files = sorted([
        f for f in os.listdir(batch_dir) if f.startswith("batch_") and f.endswith(".npz")
    ])
    for bf in batch_files:
        d = np.load(os.path.join(batch_dir, bf), allow_pickle=True)
        ids = d["genome_ids"]
        feats = d["features"]
        for gid, feat in zip(ids, feats):
            genome_features[str(gid)] = feat

    logger.info(f"  Loaded {len(genome_features)} unique genome feature vectors")
    return genome_features, total_processed


# ============================================================================
# PHASE 3 — MODEL TRAINING (PER-ANTIBIOTIC)
# ============================================================================
def get_models(use_gpu: bool = False) -> Dict:
    """Return dict of model_name → configured estimator."""
    models = {
        "RandomForest": RandomForestClassifier(
            n_estimators=500,
            max_depth=30,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight="balanced",
        ),
        "GradientBoosting": GradientBoostingClassifier(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=10,
            subsample=0.8,
            random_state=42,
        ),
        "LogisticRegression": LogisticRegression(
            C=1.0,
            max_iter=2000,
            random_state=42,
            solver="lbfgs",
            class_weight="balanced",
        ),
    }

    if HAS_XGBOOST:
        xgb_params = {
            "n_estimators": 500,
            "max_depth": 10,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "eval_metric": "logloss",
            "n_jobs": -1,
        }
        if use_gpu:
            xgb_params["device"] = "cuda"
            xgb_params["tree_method"] = "hist"
        models["XGBoost"] = XGBClassifier(**xgb_params)

    return models


def train_per_antibiotic(
    metadata: pd.DataFrame,
    genome_features: Dict[str, np.ndarray],
    model_dir: str,
    use_gpu: bool = False,
    min_samples: int = 30,
) -> Dict:
    """
    Train one binary model per antibiotic.
    Returns a manifest dict with training results.
    """
    os.makedirs(model_dir, exist_ok=True)

    logger.info("\n" + "=" * 60)
    logger.info("  PHASE 3: Training per-antibiotic models")
    logger.info("=" * 60)

    antibiotics = sorted(metadata["antibiotic"].unique())
    manifest = {
        "trained_antibiotics": [],
        "skipped_antibiotics": [],
        "models": {},
    }

    for ab in antibiotics:
        ab_data = metadata[metadata["antibiotic"] == ab].copy()

        # Filter to genomes we actually have features for
        ab_data = ab_data[ab_data["genome_id"].astype(str).isin(genome_features)]

        # Check class balance
        r_count = len(ab_data[ab_data["resistance"] == "Resistant"])
        s_count = len(ab_data[ab_data["resistance"] == "Susceptible"])

        if r_count < min_samples // 2 or s_count < min_samples // 2:
            logger.warning(
                f"\n  SKIP {ab}: not enough samples "
                f"(R={r_count}, S={s_count}, need ≥{min_samples // 2} each)"
            )
            manifest["skipped_antibiotics"].append({
                "name": ab, "reason": f"R={r_count}, S={s_count}"
            })
            continue

        logger.info(f"\n{'━' * 60}")
        logger.info(f"  Training: {ab}  (R={r_count}, S={s_count}, Total={len(ab_data)})")
        logger.info(f"{'━' * 60}")

        # Build X, y
        X_list = []
        y_list = []
        for _, row in ab_data.iterrows():
            gid = str(row["genome_id"])
            feat = genome_features.get(gid)
            if feat is not None:
                X_list.append(feat)
                y_list.append(row["resistance"])

        X = np.array(X_list, dtype=np.float32)
        le = LabelEncoder()
        y = le.fit_transform(y_list)

        # Stratified split
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.20, random_state=42, stratify=y
            )
        except ValueError:
            # If too few samples for stratification
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.20, random_state=42
            )

        # Scale
        scaler = StandardScaler()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s = scaler.transform(X_test)

        # Train all models
        models = get_models(use_gpu=use_gpu)
        results = {}

        for model_name, model in models.items():
            try:
                t0 = time.time()
                model.fit(X_train_s, y_train)
                train_time = time.time() - t0

                y_pred = model.predict(X_test_s)
                acc = accuracy_score(y_test, y_pred)
                prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
                rec = recall_score(y_test, y_pred, average="weighted", zero_division=0)
                f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)

                results[model_name] = {
                    "model": model,
                    "accuracy": acc,
                    "precision": prec,
                    "recall": rec,
                    "f1": f1,
                    "train_time": train_time,
                }

                logger.info(
                    f"    {model_name:25s}  "
                    f"Acc={acc:.4f}  F1={f1:.4f}  ({train_time:.1f}s)"
                )
            except Exception as e:
                logger.warning(f"    {model_name} failed: {e}")

        if not results:
            logger.error(f"  All models failed for {ab}!")
            continue

        # Pick best by F1
        best_name = max(results, key=lambda n: results[n]["f1"])
        best = results[best_name]
        best_model = best["model"]

        # If best accuracy < 85%, try to boost with hyperparameter tuning
        if best["accuracy"] < 0.85 and len(X_train_s) >= 100:
            logger.info(f"    Accuracy {best['accuracy']:.2%} < 85%. Attempting fine-tuning...")
            tuned_name, tuned_result = _finetune_model(
                best_name, X_train_s, X_test_s, y_train, y_test, use_gpu
            )
            if tuned_result and tuned_result["accuracy"] > best["accuracy"]:
                best_name = tuned_name
                best = tuned_result
                best_model = tuned_result["model"]
                results[tuned_name] = tuned_result
                logger.info(
                    f"    Tuned {tuned_name}: Acc={best['accuracy']:.4f}  F1={best['f1']:.4f}"
                )

        # Print classification report
        y_pred_best = best_model.predict(X_test_s)
        logger.info(f"\n    Best: {best_name}  Accuracy={best['accuracy']:.4f}")
        logger.info(f"\n{classification_report(y_test, y_pred_best, target_names=le.classes_, zero_division=0)}")

        # Save model + scaler + label encoder
        safe_ab = ab.lower().replace(" ", "_").replace("/", "_")
        model_path = os.path.join(model_dir, f"model_{safe_ab}.joblib")
        scaler_path = os.path.join(model_dir, f"scaler_{safe_ab}.joblib")
        encoder_path = os.path.join(model_dir, f"encoder_{safe_ab}.joblib")

        joblib.dump(best_model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(le, encoder_path)

        manifest["trained_antibiotics"].append(ab)
        manifest["models"][ab] = {
            "best_model": best_name,
            "accuracy": round(best["accuracy"], 4),
            "f1": round(best["f1"], 4),
            "precision": round(best["precision"], 4),
            "recall": round(best["recall"], 4),
            "train_samples": len(X_train_s),
            "test_samples": len(X_test_s),
            "model_file": f"model_{safe_ab}.joblib",
            "scaler_file": f"scaler_{safe_ab}.joblib",
            "encoder_file": f"encoder_{safe_ab}.joblib",
            "classes": list(le.classes_),
        }

        logger.info(f"    ✅ Saved: {model_path}")

    # Save manifest
    manifest_path = os.path.join(model_dir, "training_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    logger.info(f"\n  Manifest saved: {manifest_path}")

    return manifest


def _finetune_model(model_name, X_train, X_test, y_train, y_test, use_gpu):
    """Quick hyperparameter tuning for the best model to push accuracy higher."""
    from sklearn.model_selection import GridSearchCV

    try:
        if "XGBoost" in model_name and HAS_XGBOOST:
            base_params = {"random_state": 42, "eval_metric": "logloss", "n_jobs": -1}
            if use_gpu:
                base_params["device"] = "cuda"
                base_params["tree_method"] = "hist"
            base = XGBClassifier(**base_params)
            param_grid = {
                "n_estimators": [600],
                "max_depth": [10, 15],
                "learning_rate": [0.05, 0.1],
            }
        elif "RandomForest" in model_name:
            base = RandomForestClassifier(random_state=42, n_jobs=-1, class_weight="balanced")
            param_grid = {
                "n_estimators": [500, 800, 1000],
                "max_depth": [20, 40, None],
                "min_samples_split": [2, 5],
            }
        elif "GradientBoosting" in model_name:
            base = GradientBoostingClassifier(random_state=42)
            param_grid = {
                "n_estimators": [300, 500],
                "max_depth": [6, 10, 12],
                "learning_rate": [0.05, 0.1, 0.15],
                "subsample": [0.8, 0.9],
            }
        else:
            return model_name, None

        cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        grid = GridSearchCV(
            base, param_grid, cv=cv, scoring="accuracy",
            n_jobs=1, verbose=0, refit=True,
        )
        grid.fit(X_train, y_train)

        y_pred = grid.best_estimator_.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        f1_val = f1_score(y_test, y_pred, average="weighted", zero_division=0)

        return f"{model_name}_Tuned", {
            "model": grid.best_estimator_,
            "accuracy": acc,
            "f1": f1_val,
            "precision": precision_score(y_test, y_pred, average="weighted", zero_division=0),
            "recall": recall_score(y_test, y_pred, average="weighted", zero_division=0),
            "train_time": 0,
        }
    except Exception as e:
        logger.warning(f"    Fine-tuning failed: {e}")
        return model_name, None


# ============================================================================
# PHASE 4 — SUMMARY
# ============================================================================
def print_final_summary(manifest: Dict):
    """Pretty-print the final training results."""
    print("\n")
    print("+" + "=" * 68 + "+")
    print("|  ZENTHERA - TRAINING COMPLETE                                      |")
    print("+" + "-" * 68 + "+")

    total_ab = len(manifest.get("trained_antibiotics", []))
    skipped = len(manifest.get("skipped_antibiotics", []))
    models = manifest.get("models", {})

    accuracies = [m["accuracy"] for m in models.values()]
    avg_acc = np.mean(accuracies) if accuracies else 0
    min_acc = np.min(accuracies) if accuracies else 0
    max_acc = np.max(accuracies) if accuracies else 0

    print(f"|  Antibiotics trained : {total_ab:4d}  (skipped: {skipped})                     |")
    print(f"|  Average accuracy    : {avg_acc:.2%}                                     |")
    print(f"|  Best accuracy       : {max_acc:.2%}                                     |")
    print(f"|  Lowest accuracy     : {min_acc:.2%}                                     |")
    print("+" + "-" * 68 + "+")
    print(f"|  {'Antibiotic':<28s} {'Model':<20s} {'Accuracy':>8s}  |")
    print("|  " + "-" * 64 + "  |")

    for ab in sorted(models.keys()):
        m = models[ab]
        acc_str = f"{m['accuracy']:.2%}"
        icon = "[OK]" if m["accuracy"] >= 0.85 else "[!!]"
        print(f"|  {icon} {ab:<24s} {m['best_model']:<20s} {acc_str:>7s}  |")

    print("+" + "-" * 68 + "+")

    above_85 = sum(1 for m in models.values() if m["accuracy"] >= 0.85)
    print(f"|  {above_85}/{total_ab} models achieved >=85% accuracy                        |")
    print("|                                                                    |")
    print("|  To predict the best antibiotic for a new genome:                  |")
    print("|    python predict_best_antibiotic.py --fasta your_genome.fasta     |")
    print("+" + "=" * 68 + "+")
    print()


# ============================================================================
# MAIN
# ============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Zenthera: Large-scale genomic AMR training pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--target", type=int, default=100_000,
        help="Target number of genomes to process (default: 100000)",
    )
    parser.add_argument(
        "--batch_size", type=int, default=500,
        help="Genomes per download batch (default: 500)",
    )
    parser.add_argument(
        "--output_dir", default="./pipeline_data",
        help="Directory for intermediate data (default: ./pipeline_data)",
    )
    parser.add_argument(
        "--model_dir", default="./trained_models",
        help="Directory to save trained models (default: ./trained_models)",
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Resume from existing metadata & feature batches",
    )
    parser.add_argument(
        "--train_only", action="store_true",
        help="Skip download, train from existing cached features",
    )
    parser.add_argument(
        "--test_run", action="store_true",
        help="Quick test with only 200 samples (2 batches of 100)",
    )
    parser.add_argument(
        "--gpu", action="store_true",
        help="Use GPU for XGBoost training (requires CUDA-enabled XGBoost)",
    )
    parser.add_argument(
        "--bvbrc_limit", type=int, default=3000,
        help="Max records per antibiotic/phenotype from BV-BRC (default: 3000)",
    )
    parser.add_argument(
        "--ncbi_limit", type=int, default=1500,
        help="Max records per antibiotic/phenotype from NCBI (default: 1500)",
    )

    args = parser.parse_args()

    # Test run overrides
    if args.test_run:
        args.target = 200
        args.batch_size = 100
        args.bvbrc_limit = 20
        args.ncbi_limit = 10
        logger.info("🧪 TEST RUN MODE: 200 samples only")

    os.makedirs(args.output_dir, exist_ok=True)
    os.makedirs(args.model_dir, exist_ok=True)

    # Detect GPU
    use_gpu = args.gpu
    if use_gpu and HAS_XGBOOST:
        try:
            import subprocess
            result = subprocess.run(["nvidia-smi"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                logger.info("🟢 NVIDIA GPU detected — XGBoost will use CUDA")
            else:
                logger.warning("nvidia-smi failed — falling back to CPU")
                use_gpu = False
        except Exception:
            logger.warning("nvidia-smi not found — falling back to CPU")
            use_gpu = False

    logger.info("\n" + "█" * 60)
    logger.info("  ZENTHERA — Large-Scale Genomic Training Pipeline")
    logger.info("█" * 60)
    logger.info(f"  Target genomes  : {args.target:,}")
    logger.info(f"  Batch size      : {args.batch_size}")
    logger.info(f"  Output dir      : {args.output_dir}")
    logger.info(f"  Model dir       : {args.model_dir}")
    logger.info(f"  GPU             : {'YES' if use_gpu else 'NO'}")
    logger.info(f"  XGBoost         : {'YES' if HAS_XGBOOST else 'NO (pip install xgboost)'}")
    logger.info(f"  Free disk       : {disk_free_gb(args.output_dir):.1f} GB")
    logger.info("█" * 60)

    pipeline_start = time.time()

    # ── Phase 1: Metadata ──
    metadata = collect_all_metadata(args.output_dir, args.bvbrc_limit, args.ncbi_limit)

    # ── Phase 2: Download + extract features ──
    if args.train_only:
        logger.info("\n  --train_only: Loading cached features...")
        batch_dir = os.path.join(args.output_dir, "feature_batches")
        genome_features: Dict[str, np.ndarray] = {}
        if os.path.isdir(batch_dir):
            for bf in sorted(os.listdir(batch_dir)):
                if bf.endswith(".npz"):
                    d = np.load(os.path.join(batch_dir, bf), allow_pickle=True)
                    for gid, feat in zip(d["genome_ids"], d["features"]):
                        genome_features[str(gid)] = feat
        logger.info(f"  Loaded {len(genome_features)} cached genome features")
        if not genome_features:
            logger.error("No cached features found! Run without --train_only first.")
            sys.exit(1)
    else:
        genome_features, total_processed = process_batches(
            metadata, args.output_dir, args.batch_size, args.target
        )

    # ── Phase 3: Train models ──
    manifest = train_per_antibiotic(
        metadata, genome_features, args.model_dir, use_gpu=use_gpu
    )

    # ── Phase 4: Summary ──
    total_time = time.time() - pipeline_start
    logger.info(f"\n  Total pipeline time: {total_time/3600:.1f} hours")

    print_final_summary(manifest)


if __name__ == "__main__":
    main()
