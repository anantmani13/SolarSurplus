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

if HAS_TORCH:
    class SolarLSTM(nn.Module):
        """
        LSTM model for solar power generation forecasting.
        """
        def __init__(
            self,
            input_size: int,
            hidden_size: int = 128,
            num_layers: int = 2,
            dropout: float = 0.2,
            output_size: int = 1,
        ):
            super().__init__()
            self.hidden_size = hidden_size
            self.num_layers = num_layers

            self.lstm = nn.LSTM(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                dropout=dropout if num_layers > 1 else 0,
                batch_first=True,
            )
            self.dropout = nn.Dropout(dropout)
            self.fc1 = nn.Linear(hidden_size, 64)
            self.relu = nn.ReLU()
            self.fc2 = nn.Linear(64, output_size)

        def forward(self, x):
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            lstm_out, _ = self.lstm(x, (h0, c0))
            last_output = lstm_out[:, -1, :]
            out = self.dropout(last_output)
            out = self.relu(self.fc1(out))
            out = self.fc2(out)
            return out.squeeze(-1)


class SolarPredictor:
    """Manages ML model loading and inference (XGBoost & LSTM)."""

    def __init__(self):
        self.lstm_model = None
        self.xgb_model = None
        self.scaler = None
        self.pca = None
        self._loaded = False
        self.last_used_model = "Physics-Based Estimation"

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

            if HAS_TORCH and os.path.exists(settings.lstm_model_path):
                # Load the checkpoint dictionary
                checkpoint = torch.load(settings.lstm_model_path, map_location=torch.device('cpu'))
                if "model_state_dict" in checkpoint:
                    input_size = checkpoint.get("input_size", self.pca.n_components_ if self.pca else 22)
                    hidden_size = checkpoint.get("hidden_size", 128)
                    num_layers = checkpoint.get("num_layers", 2)
                    self.lstm_model = SolarLSTM(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers)
                    self.lstm_model.load_state_dict(checkpoint["model_state_dict"])
                else:
                    input_size = self.pca.n_components_ if self.pca and hasattr(self.pca, 'n_components_') else 22
                    self.lstm_model = SolarLSTM(input_size=input_size)
                    self.lstm_model.load_state_dict(checkpoint)
                
                self.lstm_model.eval()
                print("[PREDICTOR] LSTM model loaded successfully")

            self._loaded = True
        except Exception as e:
            print(f"[PREDICTOR] Warning: Could not load models: {repr(e)}", flush=True)
            print("[PREDICTOR] Falling back to physics-based estimation")

    def _build_feature_matrix(self, weather_data: list[dict]) -> np.ndarray:
        """
        Extract the full 22-feature time-series matrix expected by the trained ML pipeline:
        ['MODULE_TEMP', 'Amb_Temp', 'WIND_Speed', 'IRR (W/m2)', 'DC Current in Amps',
         'AC Ir in Amps', 'AC Iy in Amps', 'AC Ib in Amps',
         'AC Power in Watts_lag_1', ..., 'AC Power in Watts_rolling_std_24']

        Properly factors in:
          - Irradiance (GHI)
          - Ambient Temperature
          - Convective Wind Speed Cooling (T_module = T_amb + (25 * GHI/800) / (1 + 0.05*v_wind))
          - Thermal derating factor
        """
        rows = []
        for h in weather_data:
            irr = float(h.get("ghi", 0))
            amb = float(h.get("temperature", 25))
            wind = max(0.0, float(h.get("wind_speed", 2)))

            # Module temperature considering convective wind cooling
            cooling = 1.0 + 0.05 * wind
            mod_temp = amb + (irr / 800.0) * 25.0 / cooling

            # Temperature derate (power drops ~0.4% per °C above 25°C)
            temp_derate = max(0.65, 1.0 - 0.004 * (mod_temp - 25.0))

            dc_curr = (irr / 1000.0) * 8.5 * temp_derate
            ac_ir = (irr / 1000.0) * 12.0 * temp_derate
            ac_iy = (irr / 1000.0) * 12.0 * temp_derate
            ac_ib = (irr / 1000.0) * 12.0 * temp_derate
            est_power = (irr / 1000.0) * 330000.0 * temp_derate * 0.85

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
        Predict hourly solar generation using LSTM, falling back to XGBoost, then Physics.
        """
        degradation_factor = max(0.0, 1.0 - 0.005 * panel_age_years)
        effective_capacity = panel_capacity_kw * degradation_factor
        self.last_used_model = "Physics-Based Estimation"
        plant_nominal_kw = 330.0

        predictions = []

        # TIER 1: LSTM MODEL
        if self.lstm_model and self.scaler and self.pca and self._loaded:
            try:
                X = self._build_feature_matrix(weather_data)
                X_scaled = self.scaler.transform(X)
                X_pca = self.pca.transform(X_scaled)

                # Determine if LSTM expects PCA features or full scaled features
                lstm_input = X_pca if self.lstm_model.lstm.input_size == self.pca.n_components_ else X_scaled
                
                seq_len = 24
                lstm_preds = []

                for i, hour_data in enumerate(weather_data):
                    if i < seq_len - 1:
                        pad_len = seq_len - 1 - i
                        pad = np.repeat(lstm_input[0:1], pad_len, axis=0)
                        seq = np.vstack([pad, lstm_input[:i+1]])
                    else:
                        seq = lstm_input[i - seq_len + 1 : i + 1]

                    seq_tensor = torch.FloatTensor(seq).unsqueeze(0)
                    with torch.no_grad():
                        pred = self.lstm_model(seq_tensor).item()

                    raw_pred_kw = pred / 1000.0
                    ghi = float(hour_data.get("ghi", 0))

                    if ghi <= 10.0:
                        lstm_preds.append(0.0)
                    else:
                        pred_ratio = max(0.0, raw_pred_kw / plant_nominal_kw)
                        gen = min(effective_capacity, pred_ratio * effective_capacity * 1.25)
                        lstm_preds.append(round(float(gen), 3))

                self.last_used_model = "LSTM Neural Network"
                return lstm_preds
            except Exception as e:
                print(f"[PREDICTOR] LSTM inference failed ({e}). Falling back to XGBoost.")

        # TIER 2: XGBoost MODEL
        if self.xgb_model and self.scaler and self.pca and self._loaded:
            try:
                X = self._build_feature_matrix(weather_data)
                X_scaled = self.scaler.transform(X)
                X_pca = self.pca.transform(X_scaled)
                raw_preds = self.xgb_model.predict(X_pca)
                raw_preds_kw = raw_preds / 1000.0

                for i, hour_data in enumerate(weather_data):
                    ghi = float(hour_data.get("ghi", 0))
                    if ghi <= 10.0:
                        predictions.append(0.0)
                    else:
                        pred_ratio = max(0.0, raw_preds_kw[i] / plant_nominal_kw)
                        gen = min(effective_capacity, pred_ratio * effective_capacity * 1.25)
                        predictions.append(round(float(gen), 3))

                self.last_used_model = "XGBoost Regressor"
                return predictions
            except Exception as e:
                print(f"[PREDICTOR] XGBoost ML inference failed ({e}). Falling back to PV model.")
                predictions = []

        # TIER 3: Physics-based fallback
        for hour_data in weather_data:
            ghi = float(hour_data.get("ghi", 0))
            amb = float(hour_data.get("temperature", 25.0))
            wind = float(hour_data.get("wind_speed", 2.0))
            gen = estimate_solar_generation(
                ghi=ghi,
                panel_capacity_kw=effective_capacity,
                temperature=amb,
                wind_speed=wind,
            )
            predictions.append(round(float(gen), 3))

        self.last_used_model = "Physics-Based Estimation"
        return predictions


# Singleton instance
predictor = SolarPredictor()

