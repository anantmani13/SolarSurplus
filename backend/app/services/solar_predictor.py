"""
Solar Predictor Service.

Loads trained ML models (XGBoost/LSTM) and generates
solar generation forecasts using weather data.
"""

import os
import numpy as np
from typing import Optional

# These imports work when models are available
try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

from app.config import settings
from app.services.weather_service import estimate_solar_generation


class SolarPredictor:
    """Manages ML model loading and inference."""

    def __init__(self):
        self.xgb_model = None
        self.scaler = None
        self.pca = None
        self._loaded = False

    def load_models(self):
        """Load trained models from disk (if available)."""
        try:
            if os.path.exists(settings.xgboost_model_path) and HAS_XGBOOST:
                self.xgb_model = xgb.XGBRegressor()
                self.xgb_model.load_model(settings.xgboost_model_path)
                print("[PREDICTOR] XGBoost model loaded")

            if HAS_JOBLIB and os.path.exists(settings.scaler_path):
                self.scaler = joblib.load(settings.scaler_path)
                print("[PREDICTOR] Scaler loaded")

            if HAS_JOBLIB and os.path.exists(settings.pca_path):
                self.pca = joblib.load(settings.pca_path)
                print("[PREDICTOR] PCA loaded")

            self._loaded = True
        except Exception as e:
            print(f"[PREDICTOR] Warning: Could not load models: {e}")
            print("[PREDICTOR] Falling back to physics-based estimation")

    def predict_generation(
        self,
        weather_data: list[dict],
        panel_capacity_kw: float,
        panel_age_years: float = 0,
    ) -> list[float]:
        """
        Predict hourly solar generation.

        If ML models are loaded, uses XGBoost.
        Otherwise, falls back to physics-based estimation.
        """
        # Apply panel degradation (0.5% per year)
        degradation_factor = max(0.0, 1.0 - 0.005 * panel_age_years)
        effective_capacity = panel_capacity_kw * degradation_factor

        predictions = []

        if self.xgb_model and self._loaded:
            try:
                # ML-based prediction
                for hour_data in weather_data:
                    features = self._extract_features(hour_data)
                    if self.scaler:
                        features = self.scaler.transform(features.reshape(1, -1))
                    if self.pca:
                        features = self.pca.transform(features.reshape(1, -1))
                    pred = self.xgb_model.predict(features.reshape(1, -1))[0]
                    # Scale prediction to user's panel capacity
                    pred = max(0, pred * effective_capacity)
                    predictions.append(round(float(pred), 3))
                return predictions
            except Exception as e:
                print(f"[PREDICTOR] ML model inference failed ({e}). Falling back to physics-based estimation.")
                predictions = []

        # Physics-based fallback
        for hour_data in weather_data:
            ghi = hour_data.get("ghi", 0)
            gen = estimate_solar_generation(ghi, effective_capacity)
            predictions.append(round(float(gen), 3))

        return predictions

    def _extract_features(self, hour_data: dict) -> np.ndarray:
        """Extract feature vector from weather data for ML model."""
        features = [
            hour_data.get("temperature", 25),
            hour_data.get("humidity", 50),
            hour_data.get("wind_speed", 5),
            hour_data.get("cloud_cover", 30),
            hour_data.get("ghi", 500),
            hour_data.get("dni", 400),
            hour_data.get("dhi", 100),
        ]

        # Add cyclical time features
        hour = hour_data.get("hour", 12)
        features.extend([
            np.sin(2 * np.pi * hour / 24),
            np.cos(2 * np.pi * hour / 24),
        ])

        return np.array(features, dtype=np.float32)


# Singleton instance
predictor = SolarPredictor()
