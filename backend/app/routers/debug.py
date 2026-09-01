from fastapi import APIRouter
from app.services.solar_predictor import predictor

router = APIRouter()

@router.get("/debug")
def debug():
    try:
        predictor.load_models()
    except Exception as e:
        pass
    return {
        "loaded": predictor._loaded,
        "lstm_exists": predictor.lstm_model is not None,
        "xgb_exists": predictor.xgb_model is not None,
        "scaler_exists": predictor.scaler is not None,
        "pca_exists": predictor.pca is not None,
        "last_model": predictor.last_used_model
    }
