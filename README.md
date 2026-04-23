# Zenthera — AI-Powered Antimicrobial Resistance Diagnostics

Zenthera is a computational biology platform that predicts antibiotic resistance directly from bacterial genome sequences using Machine Learning. Upload a `.fasta` genome file and receive instant resistance predictions across 14 antibiotics.

## Architecture

```text
zenthera/
├── frontend/          # React + Vite + Tailwind UI
├── backend/           # Node.js/Express MERN Backend
│   ├── models/        # MongoDB Schemas (User, Patient, Report)
│   ├── routes/        # API Routes
│   └── server.js      # Master Entry Point (Serves React, Proxies to Flask)
├── ml/                # Python ML Pipeline
│   ├── api.py         # Flask REST API (Runs in background)
│   ├── trained_models/# AI Models
│   └── requirements.txt
└── README.md
```

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19, Tailwind CSS 4, Framer Motion, Recharts |
| Backend  | Node.js, Express, MongoDB Atlas, JWT |
| ML       | Flask, scikit-learn, XGBoost, K-mer extraction (K=7) |
| Data     | BV-BRC (Bacterial & Viral Bioinformatics Resource Center) |

## Running Locally

### 1. Start the ML Backend (Port 5000)
```bash
cd ml
pip install -r requirements.txt
python api.py
```

### 2. Start the Node Backend (Port 4000)
```bash
cd backend
npm install
node server.js
```

### 3. Start the Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

## Supported Antibiotics (14)

Amoxicillin · Ampicillin · Azithromycin · Cefixime · Ciprofloxacin · Clindamycin · Erythromycin · Gentamicin · Levofloxacin · Meropenem · Ofloxacin · Penicillin · Tetracycline · Vancomycin

## Deployment (Render Free Tier - Single Service)

You can run both Node.js and Python on a single Render Free Tier instance using this configuration:

1. Create a **Web Service** on Render connected to this repository.
2. Set **Environment**: `Node`
3. Set **Build Command**: 
   ```bash
   cd frontend && npm install && npm run build && cd ../backend && npm install && cd ../ml && pip install -r requirements.txt
   ```
4. Set **Start Command**: 
   ```bash
   python ml/api.py & node backend/server.js
   ```
5. **Environment Variables**:
   - `MONGO_URI` = `mongodb+srv://tanmay261006_1:tanmay123@cluster1.9bpvqzm.mongodb.net/zenthera?appName=Cluster1`
   - `JWT_SECRET` = `zenthera_ai_secret_key_2026`
   - `PYTHON_VERSION` = `3.11.12`

## Training Pipeline

To retrain models on fresh BV-BRC data:
```bash
cd ml
python batch_train_100k.py --target 4400 --gpu --batch_size 500
```

## License

MIT
