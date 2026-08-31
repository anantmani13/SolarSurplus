"""Application configuration loaded from environment variables."""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    port: int = 8000
    cors_origins: list[str] = ["*"]

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

    class Config:
        env_file = ".env"


settings = Settings()
