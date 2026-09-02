"""Application configuration loaded from environment variables."""

import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", 8000)))
    cors_origins: list[str] = [
        "https://solarsurplus-531a4.web.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ]

    # Model paths
    xgboost_model_path: str = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "saved_models", "xgboost_solar.json"
    )
    lstm_model_path: str = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "saved_models", "lstm_solar.pt"
    )
    scaler_path: str = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "saved_models", "scaler.pkl"
    )
    pca_path: str = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "saved_models", "pca.pkl"
    )

    # Model pipeline toggles (provider portability / lighter deploys).
    # Set ENABLE_LSTM_MODEL=false to skip the heavy torch runtime and go
    # straight to XGBoost (lighter) then physics. ENABLE_XGBOOST_MODEL=false
    # forces physics-only, e.g. for testing.
    enable_lstm_model: bool = os.getenv("ENABLE_LSTM_MODEL", "true").lower() in {"1", "true", "yes", "on"}
    enable_xgboost_model: bool = os.getenv("ENABLE_XGBOOST_MODEL", "true").lower() in {"1", "true", "yes", "on"}

    # ML output realism calibration. The trained models were scaled from a
    # 330 kW reference plant and tend to under-predict residential rooftops;
    # this lift (1.6x default) brings peak ML output closer to real-world
    # numbers while staying clamped to panel capacity.
    ml_output_calibration: float = float(os.getenv("ML_OUTPUT_CALIBRATION", "1.6"))


settings = Settings()

