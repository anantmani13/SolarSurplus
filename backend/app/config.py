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


settings = Settings()

