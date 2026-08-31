"""Weather API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from app.services.weather_service import fetch_weather_forecast

router = APIRouter()


@router.get("/forecast")
async def get_weather_forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    days: int = Query(default=7, ge=1, le=16, description="Forecast days"),
):
    """Fetch weather + solar irradiance forecast for a location."""
    try:
        data = await fetch_weather_forecast(lat, lon, days)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather API error: {str(e)}")
