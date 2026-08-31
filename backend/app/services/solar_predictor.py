"""
Solar Predictor Service.

Loads trained ML models (XGBoost & LSTM) and generates
solar generation forecasts using weather data.
"""

import os
import numpy as np
import pandas as pd
from typing import Optional

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

try:
    import torch
    import torch.nn as nn
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

from app.config import settings
from app.services.weather_service import estimate_solar_generation


class SolarPredictor:
    """Manages ML model loading and inference (XGBoost & LSTM)."""

    def __init__(self):
        self.xgb_model = None
        self.scaler = None
        self.pca = None
        self._loaded = False

    def load_models(self):
        """Load trained models from disk."""
        try:
            if os.path.exists(settings.xgboost_model_path) and HAS_XGBOOST:
                self.xgb_model = xgb.XGBRegressor()
                self.xgb_model.load_model(settings.xgboost_model_path)
                print("[PREDICTOR] XGBoost model loaded successfully")

            if HAS_JOBLIB and os.path.exists(settings.scaler_path):
                self.scaler = joblib.load(settings.scaler_path)
                print("[PREDICTOR] Scaler loaded successfully")

            if HAS_JOBLIB and os.path.exists(settings.pca_path):
                self.pca = joblib.load(settings.pca_path)
                print("[PREDICTOR] PCA loaded successfully")

            self._loaded = True
        except Exception as e:
            print(f"[PREDICTOR] Warning: Could not load models: {e}")
            print("[PREDICTOR] Falling back to physics-based estimation")

    def _build_feature_matrix(self, weather_data: list[dict]) -> np.ndarray:
        """
        Extract the full 22-feature time-series matrix expected by the trained ML pipeline:
        ['MODULE_TEMP', 'Amb_Temp', 'WIND_Speed', 'IRR (W/m2)', 'DC Current in Amps',
         'AC Ir in Amps', 'AC Iy in Amps', 'AC Ib in Amps',
         'AC Power in Watts_lag_1', ..., 'AC Power in Watts_rolling_std_24']
        """
        rows = []
        for h in weather_data:
            irr = float(h.get("ghi", 0))
            amb = float(h.get("temperature", 25))
            wind = float(h.get("wind_speed", 5))
            mod_temp = amb + (irr / 800.0) * 25.0
            dc_curr = (irr / 1000.0) * 8.5
            ac_ir = (irr / 1000.0) * 12.0
            ac_iy = (irr / 1000.0) * 12.0
            ac_ib = (irr / 1000.0) * 12.0
            est_power = (irr / 1000.0) * 330000.0
            rows.append({
                "MODULE_TEMP": mod_temp,
                "Amb_Temp": amb,
                "WIND_Speed": wind,
                "IRR (W/m2)": irr,
                "DC Current in Amps": dc_curr,
                "AC Ir in Amps": ac_ir,
                "AC Iy in Amps": ac_iy,
                "AC Ib in Amps": ac_ib,
                "AC Power in Watts": est_power,
            })

        df = pd.DataFrame(rows)
        target_col = "AC Power in Watts"

        for lag in [1, 2, 3, 6, 12, 24]:
            df[f"{target_col}_lag_{lag}"] = df[target_col].shift(lag).bfill().ffill()

        for window in [3, 6, 12, 24]:
            df[f"{target_col}_rolling_mean_{window}"] = df[target_col].rolling(window=window, min_periods=1).mean()
            df[f"{target_col}_rolling_std_{window}"] = df[target_col].rolling(window=window, min_periods=1).std().fillna(0)

        feature_cols = [c for c in df.columns if c != target_col]
        return df[feature_cols].values

    def predict_generation(
        self,
        weather_data: list[dict],
        panel_capacity_kw: float,
        panel_age_years: float = 0,
    ) -> list[float]:
        """
        Predict hourly solar generation using XGBoost ML model (or physics fallback).
        """
        degradation_factor = max(0.0, 1.0 - 0.005 * panel_age_years)
        effective_capacity = panel_capacity_kw * degradation_factor

        predictions = []

        if self.xgb_model and self.scaler and self.pca and self._loaded:
            try:
                # 1. Extract 22 time-series features
                X = self._build_feature_matrix(weather_data)
                # 2. StandardScaler normalization
                X_scaled = self.scaler.transform(X)
                # 3. PCA dimensionality reduction
                X_pca = self.pca.transform(X_scaled)
                # 4. XGBoost Regressor inference
                raw_preds = self.xgb_model.predict(X_pca)
                # Reference plant nominal capacity is 330 kW
                plant_nominal_kw = 330.0
                raw_preds_kw = raw_preds / 1000.0

                for i, hour_data in enumerate(weather_data):
                    ghi = hour_data.get("ghi", 0)
                    if ghi <= 10:  # Night time
                        predictions.append(0.0)
                    else:
                        pred_ratio = max(0.0, raw_preds_kw[i] / plant_nominal_kw)
                        gen = min(effective_capacity, pred_ratio * effective_capacity * 1.25)
                        predictions.append(round(float(gen), 3))

                return predictions
            except Exception as e:
                print(f"[PREDICTOR] XGBoost ML inference failed ({e}). Falling back to PV model.")
                predictions = []

        # Physics-based fallback
        for hour_data in weather_data:
            ghi = hour_data.get("ghi", 0)
            gen = estimate_solar_generation(ghi, effective_capacity)
            predictions.append(round(float(gen), 3))

        return predictions


# Singleton instance
predictor = SolarPredictor()

