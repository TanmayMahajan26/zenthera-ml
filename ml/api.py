import os
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Import ZENTHERA ML functions
from predict_best_antibiotic import load_all_models, predict_all_antibiotics

app = Flask(__name__)
CORS(app) # Enable CORS for Vite frontend (localhost:5173)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pre-load all AI models when the server starts
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trained_models")
try:
    logger.info("Initializing ZENTHERA Flask Server...")
    models = load_all_models(MODEL_DIR)
    logger.info(f"Loaded {len(models)} models globally.")
except Exception as e:
    logger.error(f"Failed to load models: {e}")
    models = {}

@app.route('/api/predict', methods=['POST'])
def predict():
    if not models:
        return jsonify({"error": "AI Models not loaded on server. Have you trained them yet?"}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No FASTA file provided in request."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        filename = secure_filename(file.filename)
        fd, temp_path = tempfile.mkstemp(suffix=".fasta")
        
        try:
            # Save uploaded bytes to a local temporary file
            file.save(temp_path)
            logger.info(f"Processing uploaded genome: {filename}")
            
            # Pass directly into the ML python pipeline
            results = predict_all_antibiotics(temp_path, models)
            
            if results:
                best = results[0]
                return jsonify({
                    "success": True,
                    "filename": filename,
                    "best_antibiotic": best["antibiotic"],
                    "best_confidence": best["susceptible_confidence"],
                    "results": results,
                    "message": "Prediction successful"
                })
            else:
                return jsonify({"error": "Failed to parse FASTA or extract 5-mers. Check file formatting."}), 400
        except Exception as e:
            logger.error(f"Prediction crashed: {e}")
            return jsonify({"error": str(e)}), 500
        finally:
            os.close(fd)
            # Clean up the large DNA string from local disk
            if os.path.exists(temp_path):
                os.remove(temp_path)

if __name__ == '__main__':
    # Run the server on port 5000
    app.run(debug=True, port=5000)
