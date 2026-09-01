import sys
import os
from app.services.solar_predictor import predictor
import traceback

print("Loading...")
predictor.load_models()
print("Models loaded. xgb:", predictor.xgb_model is not None, "lstm:", predictor.lstm_model is not None)

weather_data = [{"temperature": 30, "wind_speed": 5, "ghi": 500} for _ in range(24)]
try:
    preds = predictor.predict_generation(weather_data, panel_capacity_kw=5)
    print("Predictions:", preds)
    print("Model:", predictor.last_used_model)
except Exception as e:
    print("INFERENCE EXCEPTION:")
    traceback.print_exc()
