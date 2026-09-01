from fastapi import APIRouter
from app.services.solar_predictor import predictor
from app.models.schemas import UserInput
from app.routers.predict import generate_forecast
import traceback

router = APIRouter()

@router.get("/debug")
def debug():
    try:
        predictor.load_models()
        
        weather_data = [{"temperature": 30, "wind_speed": 5, "ghi": 500} for _ in range(24)]
        try:
            preds = predictor.predict_generation(weather_data, panel_capacity_kw=5)
            err = "None"
        except Exception as e:
            err = traceback.format_exc()
    except Exception as e:
        err = "load_models error: " + traceback.format_exc()

    return {
        "loaded": predictor._loaded,
        "lstm_exists": predictor.lstm_model is not None,
        "xgb_exists": predictor.xgb_model is not None,
        "scaler_exists": predictor.scaler is not None,
        "pca_exists": predictor.pca is not None,
        "last_model": predictor.last_used_model,
        "error": err
    }
