"""
Weather Service — Open-Meteo API Integration with Caching and Graceful Fallback.

Fetches hourly weather + solar irradiance forecasts (free, no API key).
Provides GHI, DNI, DHI, temperature, wind speed, cloud cover data.
Falls back to physics-based solar diurnal curves if the external API is rate-limited (429) or offline.
"""

import httpx
import time
import math
import asyncio
from typing import Optional
from datetime import datetime, timedelta


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

# Simple in-memory cache to prevent hitting rate limits
_WEATHER_CACHE = {}
CACHE_TTL = 3600  # 1 hour in seconds


def _generate_fallback_weather(latitude: float, longitude: float, forecast_days: int = 7) -> dict:
    """
    Generate realistic synthetic solar irradiance and weather data when Open-Meteo API is unavailable or rate-limited.
    Uses standard solar diurnal curves based on day/night cycles.
    """
    parsed_hours = []
    now = datetime.now()
    start_time = datetime(now.year, now.month, now.day, 0, 0, 0)
    total_hours = min(forecast_days, 16) * 24

    for i in range(total_hours):
        current_dt = start_time + timedelta(hours=i)
        hour = current_dt.hour
        time_str = current_dt.strftime("%Y-%m-%dT%H:00")

        # Solar zenith approximation: sun rises around 6:00, sets around 18:00, peaks at 12:00
        if 6 <= hour <= 18:
            solar_phase = math.sin(math.pi * (hour - 6) / 12)
            day_variation = 0.9 + 0.1 * math.sin(i / 24.0)
            ghi = round(max(0.0, solar_phase * 850.0 * day_variation), 1)
            dni = round(max(0.0, ghi * 0.85), 1)
            dhi = round(max(0.0, ghi * 0.15), 1)
            sunshine_duration = 3600.0 if ghi > 120 else 0.0
            cloud_cover = round(15.0 + 10.0 * math.sin(i / 12.0), 1)
        else:
            ghi = 0.0
            dni = 0.0
            dhi = 0.0
            sunshine_duration = 0.0
            cloud_cover = 20.0

        # Temperature variation (cooler at 5 AM ~22°C, warmest at 14 PM ~33°C)
        temp_phase = math.sin(math.pi * (hour - 5) / 12) if 5 <= hour <= 17 else -0.5
        temperature = round(26.0 + 6.0 * temp_phase, 1)
        humidity = round(max(30.0, min(85.0, 60.0 - 15.0 * temp_phase)), 1)
        wind_speed = round(7.0 + 3.0 * math.cos(hour / 4.0), 1)

        parsed_hours.append({
            "timestamp": time_str,
            "hour": hour,
            "temperature": temperature,
            "humidity": humidity,
            "wind_speed": wind_speed,
            "cloud_cover": cloud_cover,
            "ghi": ghi,
            "dni": dni,
            "dhi": dhi,
            "sunshine_duration": sunshine_duration,
        })

    return {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": "auto",
        "hourly": parsed_hours,
    }


async def fetch_weather_forecast(
    latitude: float,
    longitude: float,
    forecast_days: int = 7,
) -> dict:
    """
    Fetch hourly weather + solar irradiance forecast from Open-Meteo.
    Includes in-memory caching, retries, and automatic synthetic fallback on rate limits (429).

    Args:
        latitude: Location latitude
        longitude: Location longitude
        forecast_days: Number of days to forecast (max 16)

    Returns:
        Dict with hourly weather data including solar irradiance
    """
    lat_rounded = round(latitude, 2)
    lon_rounded = round(longitude, 2)
    cache_key = f"{lat_rounded}_{lon_rounded}_{forecast_days}"

    now = time.time()
    if cache_key in _WEATHER_CACHE:
        cached_data, timestamp = _WEATHER_CACHE[cache_key]
        if now - timestamp < CACHE_TTL:
            return cached_data

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join(HOURLY_PARAMS),
        "forecast_days": min(forecast_days, 16),
        "timezone": "auto",
    }

    max_retries = 2
    base_delay = 1.0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for attempt in range(max_retries):
                try:
                    response = await client.get(OPEN_METEO_URL, params=params)

                    if response.status_code == 429:
                        print(f"[WEATHER] Open-Meteo 429 rate limit reached (attempt {attempt+1}/{max_retries}).")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(base_delay * (2 ** attempt))
                            continue
                        else:
                            print("[WEATHER] Falling back to synthetic solar/weather model due to 429 rate limit.")
                            fallback_data = _generate_fallback_weather(latitude, longitude, forecast_days)
                            _WEATHER_CACHE[cache_key] = (fallback_data, now)
                            return fallback_data

                    response.raise_for_status()
                    data = response.json()

                    parsed = _parse_weather_response(data)
                    _WEATHER_CACHE[cache_key] = (parsed, now)
                    return parsed
                except (httpx.RequestError, httpx.HTTPStatusError) as e:
                    if attempt == max_retries - 1:
                        raise e
                    await asyncio.sleep(base_delay)
    except Exception as err:
        print(f"[WEATHER] Warning: Open-Meteo API unavailable ({err}). Using physics-based solar fallback.")
        fallback_data = _generate_fallback_weather(latitude, longitude, forecast_days)
        _WEATHER_CACHE[cache_key] = (fallback_data, now)
        return fallback_data


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

