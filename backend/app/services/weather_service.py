"""
Weather Service — Open-Meteo API Integration.

Fetches hourly weather + solar irradiance forecasts (free, no API key).
Provides GHI, DNI, DHI, temperature, wind speed, cloud cover data.
"""

import httpx
from typing import Optional
from functools import lru_cache
from datetime import datetime


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Hourly variables we need for solar forecasting
HOURLY_PARAMS = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "cloud_cover",
    "shortwave_radiation",           # GHI (W/m²)
    "direct_normal_irradiance",       # DNI (W/m²)
    "diffuse_radiation",              # DHI (W/m²)
    "sunshine_duration",
]


async def fetch_weather_forecast(
    latitude: float,
    longitude: float,
    forecast_days: int = 7,
) -> dict:
    """
    Fetch hourly weather + solar irradiance forecast from Open-Meteo.

    Args:
        latitude: Location latitude
        longitude: Location longitude
        forecast_days: Number of days to forecast (max 16)

    Returns:
        Dict with hourly weather data including solar irradiance
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join(HOURLY_PARAMS),
        "forecast_days": min(forecast_days, 16),
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        data = response.json()

    return _parse_weather_response(data)


def _parse_weather_response(data: dict) -> dict:
    """Parse Open-Meteo response into structured hourly entries."""
    hourly = data.get("hourly", {})
    times = hourly.get("time", [])

    parsed_hours = []
    for i, time_str in enumerate(times):
        entry = {
            "timestamp": time_str,
            "hour": datetime.fromisoformat(time_str).hour,
            "temperature": hourly.get("temperature_2m", [0])[i] if i < len(hourly.get("temperature_2m", [])) else 0,
            "humidity": hourly.get("relative_humidity_2m", [0])[i] if i < len(hourly.get("relative_humidity_2m", [])) else 0,
            "wind_speed": hourly.get("wind_speed_10m", [0])[i] if i < len(hourly.get("wind_speed_10m", [])) else 0,
            "cloud_cover": hourly.get("cloud_cover", [0])[i] if i < len(hourly.get("cloud_cover", [])) else 0,
            "ghi": hourly.get("shortwave_radiation", [0])[i] if i < len(hourly.get("shortwave_radiation", [])) else 0,
            "dni": hourly.get("direct_normal_irradiance", [0])[i] if i < len(hourly.get("direct_normal_irradiance", [])) else 0,
            "dhi": hourly.get("diffuse_radiation", [0])[i] if i < len(hourly.get("diffuse_radiation", [])) else 0,
            "sunshine_duration": hourly.get("sunshine_duration", [0])[i] if i < len(hourly.get("sunshine_duration", [])) else 0,
        }
        parsed_hours.append(entry)

    return {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "timezone": data.get("timezone", "UTC"),
        "hourly": parsed_hours,
    }


def estimate_solar_generation(
    ghi: float,
    panel_capacity_kw: float,
    panel_efficiency: float = 0.18,
    performance_ratio: float = 0.80,
    panel_area_per_kw: float = 5.0,
) -> float:
    """
    Estimate solar power generation from irradiance data.

    Uses a simplified PV model:
        Power (kW) = GHI × Panel Area × Efficiency × Performance Ratio / 1000

    Args:
        ghi: Global Horizontal Irradiance (W/m²)
        panel_capacity_kw: Rated panel capacity in kW
        panel_efficiency: Panel efficiency (default 18%)
        performance_ratio: System performance ratio (default 80%)
        panel_area_per_kw: Area in m² per kW of capacity (default 5)

    Returns:
        Estimated generation in kW for that hour
    """
    total_area = panel_capacity_kw * panel_area_per_kw
    generation_kw = (ghi * total_area * panel_efficiency * performance_ratio) / 1000.0
    # Cap at rated capacity
    return min(generation_kw, panel_capacity_kw)
