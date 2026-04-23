# Zenthera — AI-Powered Antimicrobial Resistance Diagnostics

Zenthera is a computational biology platform that predicts antibiotic resistance directly from bacterial genome sequences using Machine Learning. Upload a `.fasta` genome file and receive instant resistance predictions across 14 antibiotics.

## Architecture

```
zenthera/
├── frontend/          # React + Vite + Tailwind UI
│   └── src/
│       ├── components/   # Landing, Dashboard, HowItWorks
│       └── api/          # Axios client for /api/predict
├── ml/                # Python ML Backend
│   ├── api.py            # Flask REST API
│   ├── kmer_utils.py     # K=7 feature extraction (16,384 dimensions)
│   ├── predict_best_antibiotic.py  # Prediction engine
│   ├── batch_train_100k.py         # Training pipeline (BV-BRC data)
│   ├── trained_models/             # Trained .joblib models + manifest
│   └── requirements.txt            # Python dependencies
├── Procfile           # Render deployment config
└── README.md
```

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4, Framer Motion, Three.js |
| Backend  | Flask, Gunicorn, scikit-learn, XGBoost |
| ML       | K-mer frequency analysis (K=7), GPU-accelerated XGBoost |
| Data     | BV-BRC (Bacterial & Viral Bioinformatics Resource Center) |

## Running Locally

### 1. Start the ML Backend
```bash
cd ml
pip install -r requirements.txt
python api.py
```
Flask server starts on `http://localhost:5000`

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Vite dev server starts on `http://localhost:5173` (proxies API to Flask)

## Supported Antibiotics (14)

Amoxicillin · Ampicillin · Azithromycin · Cefixime · Ciprofloxacin · Clindamycin · Erythromycin · Gentamicin · Levofloxacin · Meropenem · Ofloxacin · Penicillin · Tetracycline · Vancomycin

## Deployment (Render Free Tier)

1. Build frontend: `cd frontend && npm run build`
2. Create a **Web Service** on Render
3. Set **Build Command**: `cd frontend && npm install && npm run build && cd ../ml && pip install -r requirements.txt`
4. Set **Start Command**: `cd ml && gunicorn api:app --bind 0.0.0.0:$PORT --timeout 120`

## Training Pipeline

To retrain models on fresh BV-BRC data:
```bash
cd ml
python batch_train_100k.py --target 4400 --gpu --batch_size 500
```

## License

MIT
