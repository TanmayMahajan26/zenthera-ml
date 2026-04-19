"""
Quick Prediction Script
=========================
Use this script to test a single new FASTA file against the trained model.

Usage:
    python predict.py --fasta path/to/genome.fasta --model_dir ./saved_models
"""

import os
import sys
import argparse
import logging
import joblib

# Import the feature extraction functions from our main pipeline
try:
    from antibiotic_resistance_predictor import parse_fasta, extract_kmer_features
except ImportError:
    print("Error: Could not import feature extraction logic. Make sure antibiotic_resistance_predictor.py is in the same directory.")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(message)s")

def predict_fasta(fasta_path: str, model_dir: str):
    if not os.path.isfile(fasta_path):
        logging.error(f"Error: FASTA file not found at {fasta_path}")
        return

    # Load the saved artifacts
    model_path = os.path.join(model_dir, "best_model_all_antibiotics_random_forest.joblib")
    scaler_path = os.path.join(model_dir, "scaler_all_antibiotics.joblib")
    encoder_path = os.path.join(model_dir, "label_encoder_all_antibiotics.joblib")

    if not all(os.path.isfile(p) for p in [model_path, scaler_path, encoder_path]):
        logging.error("Error: Could not find all trained model files. Did you run the training script and point to the right --model_dir?")
        return

    logging.info("Loading model, scaler, and label encoder...")
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    encoder = joblib.load(encoder_path)

    # Extract features
    logging.info(f"Parsing Sequence: {fasta_path}")
    sequence = parse_fasta(fasta_path)
    if not sequence:
        logging.error("Failed to extract sequence from the file.")
        return
    
    logging.info("Extracting 5-mer features...")
    features = extract_kmer_features(sequence)

    # Standardize features
    features_scaled = scaler.transform([features])

    # Predict
    pred_idx = model.predict(features_scaled)[0]
    probabilities = model.predict_proba(features_scaled)[0]
    
    prediction = encoder.inverse_transform([pred_idx])[0]
    confidence = probabilities[pred_idx] * 100

    print("\n" + "="*50)
    print("  PREDICTION RESULTS")
    print("="*50)
    print(f"  Genome       : {os.path.basename(fasta_path)}")
    print(f"  Prediction   : {prediction}")
    print(f"  Confidence   : {confidence:.2f}%")
    print("="*50 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict antibiotic resistance for a single FASTA file.")
    parser.add_argument("--fasta", required=True, help="Path to the FASTA file.")
    parser.add_argument("--model_dir", default="./saved_models", help="Directory containing the saved model joblib files.")
    
    args = parser.parse_args()
    predict_fasta(args.fasta, args.model_dir)

