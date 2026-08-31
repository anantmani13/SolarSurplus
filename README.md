# ☀️ SolarSurplus — Solar Surplus Energy Forecasting System

A full-stack application that predicts solar energy generation, forecasts energy surplus, and optimizes battery usage for maximum renewable energy self-sufficiency.

**Theme**: Sustainable & Renewable Energy

---

## 🏗️ Architecture

```
Frontend (React + Vite)  →  Backend (FastAPI)  →  ML Models (PyTorch + XGBoost)
       ↕                         ↕
    Firebase              Open-Meteo Weather API
 (Auth + Firestore)        (Free, No API Key)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ & npm
- Python 3.10+
- Kaggle dataset: [solargeneration](https://www.kaggle.com/datasets/arunkanagolkar/solargeneration) → place CSV in `ml/data/raw/`

### 1. Frontend
```bash
cd frontend
cp .env.example .env  # Add your Firebase config
npm install
npm run dev           # → http://localhost:5173
```

### 2. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. ML Training (after downloading Kaggle dataset)
```bash
cd ml/src
python data_preparation.py      # Clean & prepare data
python xgboost_model.py         # Train XGBoost
python lstm_model.py            # Train LSTM (PyTorch)
```

## 📊 ML Pipeline

| Step | Module | Details |
|------|--------|---------|
| Data Prep | `data_preparation.py` | Cleaning, temporal features, lag features, StandardScaler, PCA |
| XGBoost | `xgboost_model.py` | Hyperparameter tuning via RandomizedSearchCV |
| LSTM | `lstm_model.py` | 2-layer LSTM, PyTorch, early stopping, LR scheduling |
| Transformer | `transformer_model.py` | Phase 2 — Encoder-Decoder upgrade path |
| Evaluation | `evaluation.py` | ROC curve, confusion matrix, residual plots, R², RMSE |

## 🔑 Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Cloud Firestore** database
4. Add a web app and copy the config to `frontend/.env`

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict/forecast` | Generate 7-day solar forecast |
| `GET` | `/api/weather/forecast` | Fetch weather + irradiance data |
| `GET` | `/health` | Backend health check |
| `GET` | `/docs` | Swagger UI documentation |

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Recharts, Lucide Icons, Firebase SDK
- **Backend**: FastAPI, Python, httpx
- **ML**: PyTorch, XGBoost, scikit-learn, pandas, matplotlib
- **Storage**: Firebase Cloud Firestore
- **Weather**: Open-Meteo API (free)
