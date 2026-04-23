"""
Zenthera — Flask API Backend
==============================
Serves ML predictions to the React frontend.
Deployable on Render free tier.
"""

import os
import tempfile
import logging
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import ZENTHERA ML functions
from predict_best_antibiotic import load_all_models, predict_all_antibiotics
from kmer_utils import parse_fasta

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pre-load all AI models when the server starts
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trained_models")
MANIFEST_PATH = os.path.join(MODEL_DIR, "training_manifest.json")

try:
    logger.info("Initializing ZENTHERA Flask Server...")
    models = load_all_models(MODEL_DIR)
    logger.info(f"Loaded {len(models)} models globally.")
    
    # Load manifest for model metadata
    manifest = {}
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH) as f:
            manifest = json.load(f)
except Exception as e:
    logger.error(f"Failed to load models: {e}")
    models = {}
    manifest = {}


def get_confidence_tier(confidence: float) -> str:
    """Return a human-readable confidence tier."""
    if confidence >= 85:
        return "High"
    elif confidence >= 70:
        return "Medium"
    elif confidence >= 55:
        return "Low"
    else:
        return "Very Low"


def detect_genus(sequence: str) -> dict:
    """Simple GC-content-based genus heuristic."""
    if not sequence:
        return {"organism_match": False, "matched_genus": None}
    
    gc = (sequence.count("G") + sequence.count("C")) / len(sequence) * 100
    
    # Common bacterial GC ranges
    if 32 <= gc <= 36:
        return {"organism_match": True, "matched_genus": "Staphylococcus"}
    elif 36 <= gc <= 42:
        return {"organism_match": True, "matched_genus": "Streptococcus"}
    elif 48 <= gc <= 52:
        return {"organism_match": True, "matched_genus": "Escherichia"}
    elif 55 <= gc <= 60:
        return {"organism_match": True, "matched_genus": "Klebsiella"}
    elif 60 <= gc <= 68:
        return {"organism_match": True, "matched_genus": "Pseudomonas"}
    else:
        return {"organism_match": False, "matched_genus": "Unknown"}


# Clinical data lookup based on genus
CLINICAL_DATA = {
    "Staphylococcus": {
        "name": "Staphylococcus aureus",
        "diseases": ["Skin & Soft Tissue Infections", "Bacteremia", "Endocarditis", "Osteomyelitis"],
        "notes": "Monitor for MRSA phenotype. Consider vancomycin if methicillin-resistant."
    },
    "Streptococcus": {
        "name": "Streptococcus pneumoniae",
        "diseases": ["Pneumonia", "Meningitis", "Otitis Media", "Sinusitis"],
        "notes": "Beta-lactam resistance increasing. Check for penicillin MIC."
    },
    "Escherichia": {
        "name": "Escherichia coli",
        "diseases": ["Urinary Tract Infections", "Bacteremia", "Gastroenteritis", "Neonatal Meningitis"],
        "notes": "ESBL-producing strains increasingly common. Avoid empiric cephalosporins if ESBL suspected."
    },
    "Klebsiella": {
        "name": "Klebsiella pneumoniae",
        "diseases": ["Pneumonia", "UTI", "Bloodstream Infections", "Liver Abscess"],
        "notes": "Carbapenem-resistant strains (CRE) are a critical threat. Screen for KPC genes."
    },
    "Pseudomonas": {
        "name": "Pseudomonas aeruginosa",
        "diseases": ["Ventilator-Associated Pneumonia", "Burn Wound Infections", "Chronic Otitis", "Cystic Fibrosis"],
        "notes": "Intrinsically resistant to many antibiotics. Combination therapy often required."
    },
    "Unknown": {
        "name": "Unidentified Organism",
        "diseases": ["Requires further laboratory identification"],
        "notes": "GC content did not match common pathogen profiles. Culture-based ID recommended."
    },
}


@app.route('/api/predict', methods=['POST'])
def predict():
    """Main prediction endpoint — accepts FASTA file, returns structured results."""
    if not models:
        return jsonify({"error": "AI Models not loaded. Have you trained them yet?"}), 500

    # Accept both 'fasta' and 'file' field names for compatibility
    file = request.files.get('fasta') or request.files.get('file')
    if not file:
        return jsonify({"error": "No FASTA file provided. Use field name 'fasta'."}), 400
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = secure_filename(file.filename)
    fd, temp_path = tempfile.mkstemp(suffix=".fasta")
    
    try:
        file.save(temp_path)
        logger.info(f"Processing uploaded genome: {filename}")
        
        # Parse the genome for metadata
        sequence = parse_fasta(temp_path)
        if not sequence or len(sequence) < 100:
            return jsonify({"error": "Failed to parse FASTA file or sequence too short."}), 400
        
        gc_pct = round((sequence.count("G") + sequence.count("C")) / len(sequence) * 100, 2)
        genus_info = detect_genus(sequence)
        
        # Build genome info block
        genome_info = {
            "header": filename,
            "seq_length": len(sequence),
            "gc_pct": gc_pct,
            "organism_match": genus_info["organism_match"],
            "matched_genus": genus_info["matched_genus"],
        }
        
        # Run ML predictions
        raw_results = predict_all_antibiotics(temp_path, models)
        
        if not raw_results:
            return jsonify({"error": "Feature extraction failed. Check FASTA formatting."}), 400
        
        # Transform results to match frontend expected format
        predictions = []
        for r in raw_results:
            ab_name = r["antibiotic"]
            confidence = round(max(r["susceptible_confidence"], r["resistant_confidence"]) * 100, 1)
            
            # Get model metadata from manifest
            model_meta = manifest.get("models", {}).get(ab_name, {})
            model_accuracy = model_meta.get("accuracy", 0)
            
            predictions.append({
                "antibiotic": ab_name,
                "phenotype": r["prediction"],
                "confidence": confidence,
                "model": r.get("model_name", "XGBoost"),
                "trust_score": round(model_accuracy * 100, 1),
                "confidence_tier": get_confidence_tier(confidence),
                "det_found": False,
                "det_type": "ML Pattern",
            })
        
        # Build recommendation block
        susceptible = [p for p in predictions if p["phenotype"] == "Susceptible"]
        susceptible.sort(key=lambda x: x["confidence"], reverse=True)
        resistant = [p for p in predictions if p["phenotype"] == "Resistant"]
        
        recommendation = {
            "first_line": susceptible[:3],
            "avoid": resistant[:3],
            "total_susceptible": len(susceptible),
            "total_resistant": len(resistant),
        }
        
        # Build clinical block
        genus = genus_info.get("matched_genus", "Unknown") or "Unknown"
        clinical = CLINICAL_DATA.get(genus, CLINICAL_DATA["Unknown"])
        
        return jsonify({
            "genome": genome_info,
            "predictions": predictions,
            "recommendation": recommendation,
            "clinical": clinical,
        })
        
    except Exception as e:
        logger.error(f"Prediction crashed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        os.close(fd)
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/api/health', methods=['GET'])
def health():
    """Health check for deployment monitoring."""
    return jsonify({
        "status": "healthy",
        "models_loaded": len(models),
        "antibiotics": list(models.keys()),
    })


# Serve React frontend in production
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React frontend."""
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
