# Zenthera Clinical Frontend

This is the premium React-based diagnostic dashboard for the Zenthera AMR platform. It provides clinicians with a high-fidelity interface to upload genomic data, visualize resistance patterns, and receive clinical recommendations.

## ✨ Key Features

*   **Premium Dashboard**: Sophisticated data visualization using Tailwind CSS and Framer Motion.
*   **3D DNA Interaction**: Interactive 3D DNA helix background and genomic progress indicators.
*   **Real-time Analysis**: Live progress tracking of the hybrid diagnostic pipeline.
*   **Hybrid Results Display**: Integrated view of both Deterministic (CARD/Mutation) and Probabilistic (ML) findings.
*   **Clinical Recommendations**: Categorized antibiotic suggestions based on the predicted resistance profile.

## 🚀 Tech Stack

*   **Framework**: React 18 + Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Animations**: Framer Motion
*   **Icons**: Lucide React
*   **API Client**: Axios

## 🛠️ Development

1.  **Install**: `npm install`
2.  **Dev Server**: `npm run dev`
3.  **Build**: `npm run build`

## 🔗 Backend Integration

The frontend expects the Zenthera Flask server to be running on `http://localhost:5000`. 
The primary integration point is the `/api/predict` endpoint, which handles FASTA file uploads.

---
© 2026 Zenthera Diagnostics. Built for Advanced Clinical Genomics.
