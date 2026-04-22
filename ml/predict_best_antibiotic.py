"""
Zenthera — Best Antibiotic Predictor
======================================
Drop in a bacterial genome FASTA file → get the best antibiotic recommendation.

This script loads all per-antibiotic models trained by batch_train_100k.py,
runs the genome through every model, and ranks antibiotics by how likely
the bacteria is SUSCEPTIBLE (i.e., which drug will actually work).

Usage:
    python predict_best_antibiotic.py --fasta my_bacteria.fasta
    python predict_best_antibiotic.py --fasta my_bacteria.fasta --model_dir ./trained_models
    python predict_best_antibiotic.py --fasta my_bacteria.fasta --top 5
"""

import os
import sys
import json
import argparse
import logging

import numpy as np
import joblib

# Shared feature extraction (same pipeline as training)
from kmer_utils import parse_fasta, extract_features

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def load_all_models(model_dir: str) -> dict:
    """
    Load all trained per-antibiotic models from the model directory.

    Returns dict:
        { "Ciprofloxacin": { "model": ..., "scaler": ..., "encoder": ..., "meta": ... }, ... }
    """
    manifest_path = os.path.join(model_dir, "training_manifest.json")

    if not os.path.isfile(manifest_path):
        logger.error(
            f"Error: training_manifest.json not found in {model_dir}\n"
            f"Run batch_train_100k.py first to train the models."
        )
        sys.exit(1)

    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    loaded = {}
    trained = manifest.get("trained_antibiotics", [])

    for ab in trained:
        meta = manifest["models"].get(ab, {})
        model_file = meta.get("model_file", "")
        scaler_file = meta.get("scaler_file", "")
        encoder_file = meta.get("encoder_file", "")

        model_path = os.path.join(model_dir, model_file)
        scaler_path = os.path.join(model_dir, scaler_file)
        encoder_path = os.path.join(model_dir, encoder_file)

        if not all(os.path.isfile(p) for p in [model_path, scaler_path, encoder_path]):
            logger.warning(f"  Skipping {ab}: model files missing")
            continue

        try:
            loaded[ab] = {
                "model": joblib.load(model_path),
                "scaler": joblib.load(scaler_path),
                "encoder": joblib.load(encoder_path),
                "meta": meta,
            }
        except Exception as e:
            logger.warning(f"  Skipping {ab}: {e}")

    return loaded


def predict_all_antibiotics(fasta_path: str, models: dict) -> list:
    """
    Extract features from a FASTA file and predict susceptibility
    for every loaded antibiotic model.

    Returns a list sorted by susceptibility confidence (highest first):
        [
            {
                "antibiotic": "Rifampicin",
                "prediction": "Susceptible",
                "susceptible_confidence": 0.94,
                "resistant_confidence": 0.06,
                "model_accuracy": 0.91,
            },
            ...
        ]
    """
    # Parse genome
    logger.info(f"  Parsing genome: {os.path.basename(fasta_path)}")
    sequence = parse_fasta(fasta_path)

    if not sequence:
        logger.error("  Failed to extract any DNA sequence from the file.")
        return []

    genome_len = len(sequence)
    gc_content = (sequence.count("G") + sequence.count("C")) / genome_len * 100
    logger.info(f"  Genome length : {genome_len:,} bp")
    logger.info(f"  GC content    : {gc_content:.1f}%")

    # Extract features
    features = extract_features(sequence)
    if features is None:
        logger.error("  Feature extraction failed (sequence too short or invalid).")
        return []

    # Predict with each antibiotic model
    results = []

    for ab, model_data in models.items():
        model = model_data["model"]
        scaler = model_data["scaler"]
        encoder = model_data["encoder"]
        meta = model_data["meta"]

        # Scale features
        features_scaled = scaler.transform([features])

        # Predict
        pred_idx = model.predict(features_scaled)[0]
        prediction = encoder.inverse_transform([pred_idx])[0]

        # Get probabilities
        if hasattr(model, "predict_proba"):
            probas = model.predict_proba(features_scaled)[0]
        else:
            # Fallback for models without predict_proba
            probas = np.array([1.0, 0.0]) if pred_idx == 0 else np.array([0.0, 1.0])

        # Map to Resistant / Susceptible probabilities
        classes = list(encoder.classes_)
        resistant_idx = classes.index("Resistant") if "Resistant" in classes else 0
        susceptible_idx = classes.index("Susceptible") if "Susceptible" in classes else 1

        resistant_conf = float(probas[resistant_idx]) if resistant_idx < len(probas) else 0.0
        susceptible_conf = float(probas[susceptible_idx]) if susceptible_idx < len(probas) else 0.0

        results.append({
            "antibiotic": ab,
            "prediction": prediction,
            "susceptible_confidence": susceptible_conf,
            "resistant_confidence": resistant_conf,
            "model_accuracy": meta.get("accuracy", 0.0),
            "model_name": meta.get("best_model", "Unknown"),
        })

    # Sort by susceptibility confidence (highest = best antibiotic choice)
    results.sort(key=lambda r: r["susceptible_confidence"], reverse=True)

    return results


def display_results(fasta_path: str, results: list, top_n: int = 0):
    """Pretty-print the antibiotic recommendation report."""
    filename = os.path.basename(fasta_path)

    print()
    print("+" + "=" * 68 + "+")
    print("|     ZENTHERA - ANTIBIOTIC RECOMMENDATION REPORT                   |")
    print("+" + "-" * 68 + "+")
    print(f"|  Genome: {filename:<57s} |")
    print("+" + "-" * 68 + "+")

    if not results:
        print("|  [X] No predictions available. Train models first.                |")
        print("+" + "=" * 68 + "+")
        return

    # Best antibiotic = highest susceptibility confidence
    best = results[0]
    best_name = best["antibiotic"]
    best_conf = best["susceptible_confidence"] * 100

    print("|                                                                    |")
    print(f"|  [*] BEST ANTIBIOTIC: {best_name:<30s}              |")
    print(f"|     Susceptibility Confidence: {best_conf:5.1f}%                            |")
    print(f"|     Model Accuracy (training): {best['model_accuracy']:.2%}                            |")
    print("|                                                                    |")
    print("+" + "-" * 68 + "+")
    print("|                                                                    |")
    print(f"|  {'Rank':<5s} {'Antibiotic':<24s} {'Verdict':<10s} {'Confidence':>10s}  {'Acc':>6s}  |")
    print("|  " + "-" * 64 + "  |")

    display = results[:top_n] if top_n > 0 else results

    for rank, r in enumerate(display, start=1):
        ab = r["antibiotic"]
        conf = r["susceptible_confidence"] * 100
        acc = r["model_accuracy"] * 100

        if r["prediction"] == "Susceptible":
            icon = "[OK]"
            verdict = "EFFECTIVE"
        else:
            icon = "[XX]"
            verdict = "RESISTANT"

        print(f"|  {icon} {rank:<3d} {ab:<24s} {verdict:<10s} {conf:>8.1f}%  {acc:>5.1f}% |")

    print("|                                                                    |")
    print("+" + "-" * 68 + "+")

    # Count effective antibiotics
    effective = [r for r in results if r["prediction"] == "Susceptible"]
    resistant = [r for r in results if r["prediction"] == "Resistant"]

    print(f"|  [OK] Effective antibiotics : {len(effective):<5d}                               |")
    print(f"|  [XX] Resistant antibiotics : {len(resistant):<5d}                               |")
    print("|                                                                    |")

    if effective:
        print("|  [i] Recommended treatment options (by confidence):                |")
        for r in effective[:3]:
            c = r["susceptible_confidence"] * 100
            print(f"|     -> {r['antibiotic']:<28s} ({c:.1f}% confidence)        |")
    else:
        print("|  [!] WARNING: Bacteria appears resistant to ALL tested drugs!      |")
        print("|     Consider advanced susceptibility testing.                      |")

    print("|                                                                    |")
    print("+" + "=" * 68 + "+")
    print()

    # Also output as JSON for programmatic use
    json_output = {
        "genome_file": filename,
        "best_antibiotic": best_name,
        "best_confidence": round(best_conf, 2),
        "all_results": [
            {
                "antibiotic": r["antibiotic"],
                "prediction": r["prediction"],
                "susceptible_confidence": round(r["susceptible_confidence"] * 100, 2),
                "model_accuracy": round(r["model_accuracy"] * 100, 2),
            }
            for r in results
        ],
    }

    # Save JSON report next to the FASTA file
    json_path = fasta_path.rsplit(".", 1)[0] + "_report.json"
    try:
        with open(json_path, "w") as f:
            json.dump(json_output, f, indent=2)
        print(f"  📄 Full report saved: {json_path}")
    except Exception:
        pass


def main():
    parser = argparse.ArgumentParser(
        description="Predict the best antibiotic for a bacterial genome.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python predict_best_antibiotic.py --fasta my_bacteria.fasta
    python predict_best_antibiotic.py --fasta sample.fasta --model_dir ./trained_models
    python predict_best_antibiotic.py --fasta sample.fasta --top 5
        """,
    )
    parser.add_argument(
        "--fasta", required=True,
        help="Path to the bacterial genome FASTA file.",
    )
    parser.add_argument(
        "--model_dir", default="./trained_models",
        help="Directory containing trained models (default: ./trained_models)",
    )
    parser.add_argument(
        "--top", type=int, default=0,
        help="Show only top N results (default: show all)",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.fasta):
        logger.error(f"Error: FASTA file not found: {args.fasta}")
        sys.exit(1)

    # Load all trained models
    logger.info("  Loading trained models...")
    models = load_all_models(args.model_dir)
    logger.info(f"  Loaded {len(models)} antibiotic models")

    if not models:
        logger.error("No models loaded. Run batch_train_100k.py first.")
        sys.exit(1)

    # Predict
    results = predict_all_antibiotics(args.fasta, models)

    # Display
    display_results(args.fasta, results, top_n=args.top)


if __name__ == "__main__":
    main()
