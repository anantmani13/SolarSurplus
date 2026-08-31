"""
FastAPI Backend for Solar Surplus Energy Forecasting.

Serves ML predictions, weather data, and battery optimization
recommendations to the React frontend.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import predict, weather
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models on startup."""
    print("🚀 Starting Solar Forecast API...")
    # Models are loaded lazily in the predictor service
    yield
    print("👋 Shutting down Solar Forecast API")


app = FastAPI(
    title="Solar Surplus Energy Forecasting API",
    description="ML-powered solar generation prediction and battery optimization",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(predict.router, prefix="/api/predict", tags=["Predictions"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])


@app.get("/")
async def root():
    return {
        "name": "Solar Surplus Energy Forecasting API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "predict": "/api/predict/forecast",
            "weather": "/api/weather/forecast",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
