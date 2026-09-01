"""
Weather Service — Open-Meteo API Integration with Multi-Endpoint Fallback.

Fetches hourly weather + solar irradiance forecasts (free, no API key).
Provides GHI, DNI, DHI, temperature, wind speed (m/s), cloud cover data.

Fallback chain:
  1. Open-Meteo best_match model (primary)
  2. Open-Meteo GFS model (separate rate limit pool)
  3. Physics-based solar diurnal estimation (last resort)

Each response is tagged with `data_source` so the frontend can show transparency.
"""

import httpx
import time
import math
import asyncio
from typing import Optional
from datetime import datetime, timedelta


# Multiple Open-Meteo endpoints with separate rate limit pools
OPEN_METEO_ENDPOINTS = [
    {
        "url": "https://api.open-meteo.com/v1/forecast",
        "name": "Open-Meteo (Best Match)",
        "extra_params": {},
    },
    {
        "url": "https://api.open-meteo.com/v1/gfs",
        "name": "Open-Meteo (NOAA GFS)",
        "extra_params": {},
    },
]

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

# In-memory cache
_WEATHER_CACHE = {}
CACHE_TTL = 1800  # 30 minutes — more current data


def _generate_fallback_weather(latitude: float, longitude: float, forecast_days: int = 7) -> dict:
    """
    Generate physics-based synthetic solar irradiance and weather data.
    Used as last resort when all API endpoints are unavailable.
    Tagged with data_source='estimated' for frontend transparency.
    """
    parsed_hours = []
    now = datetime.now()
    start_time = datetime(now.year, now.month, now.day, 0, 0, 0)
    total_hours = min(forecast_days, 16) * 24

    for i in range(total_hours):
        current_dt = start_time + timedelta(hours=i)
        hour = current_dt.hour
        time_str = current_dt.strftime("%Y-%m-%dT%H:00")

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

        temp_phase = math.sin(math.pi * (hour - 5) / 12) if 5 <= hour <= 17 else -0.5
        temperature = round(26.0 + 6.0 * temp_phase, 1)
        humidity = round(max(30.0, min(85.0, 60.0 - 15.0 * temp_phase)), 1)
        # Wind speed in m/s
        wind_speed = round(2.0 + 1.0 * math.cos(hour / 4.0), 1)

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
        "data_source": "estimated",
        "hourly": parsed_hours,
    }


async def _try_fetch_endpoint(
    client: httpx.AsyncClient,
    endpoint: dict,
    params: dict,
) -> Optional[dict]:
    """Try fetching weather data from a single Open-Meteo endpoint."""
    url = endpoint["url"]
    merged_params = {**params, **endpoint["extra_params"]}
    name = endpoint["name"]

    try:
        response = await client.get(url, params=merged_params)

        if response.status_code == 429:
            print(f"[WEATHER] {name}: 429 rate limit hit, skipping.")
            return None

        response.raise_for_status()
        data = response.json()
        print(f"[WEATHER] {name}: Success (lat={data.get('latitude')}, lon={data.get('longitude')})")
        return data
    except Exception as e:
        print(f"[WEATHER] {name}: Failed ({e})")
        return None


async def fetch_weather_forecast(
    latitude: float,
    longitude: float,
    forecast_days: int = 7,
) -> dict:
    """
    Fetch hourly weather + solar irradiance forecast from Open-Meteo.

    Uses a multi-endpoint fallback chain for reliability:
      1. Open-Meteo best_match model
      2. Open-Meteo GFS model (separate rate limit)
      3. Physics-based estimation (last resort)

    All responses are tagged with `data_source` for frontend transparency.
    Wind speed is requested in m/s for ML pipeline consistency.
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
        "wind_speed_unit": "ms",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            # Try each endpoint in order
            for endpoint in OPEN_METEO_ENDPOINTS:
                data = await _try_fetch_endpoint(client, endpoint, params)
                if data is not None:
                    parsed = _parse_weather_response(data, data_source=endpoint["name"])
                    _WEATHER_CACHE[cache_key] = (parsed, now)
                    return parsed

                # Small delay before trying next endpoint
                await asyncio.sleep(0.3)

    except Exception as err:
        print(f"[WEATHER] All API endpoints failed ({err}).")

    # Last resort: physics-based fallback
    print("[WEATHER] Using physics-based solar estimation as last resort.")
    fallback_data = _generate_fallback_weather(latitude, longitude, forecast_days)
    _WEATHER_CACHE[cache_key] = (fallback_data, now)
    return fallback_data


def _parse_weather_response(data: dict, data_source: str = "Open-Meteo") -> dict:
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
        "data_source": data_source,
        "hourly": parsed_hours,
    }


def calculate_cell_temperature(
    ambient_temp: float,
    ghi: float,
    wind_speed: float,
    noct: float = 45.0,
) -> float:
    """
    Calculate PV cell temperature using Duffie-Beckman / Sandia thermal balance:
    T_cell = T_amb + (NOCT - 20) * (GHI / 800) * (1 / (1 + 0.05 * v_wind))

    Args:
        ambient_temp: Ambient temperature in °C
        ghi: Global Horizontal Irradiance in W/m²
        wind_speed: Wind speed in m/s (cooling effect)
        noct: Nominal Operating Cell Temperature (typical 45°C)

    Returns:
        Operating cell temperature in °C
    """
    wind = max(0.0, float(wind_speed))
    cooling_factor = 1.0 + 0.05 * wind
    temp_rise = ((noct - 20.0) / 800.0) * max(0.0, float(ghi)) / cooling_factor
    return round(float(ambient_temp) + temp_rise, 2)


def estimate_solar_generation(
    ghi: float,
    panel_capacity_kw: float,
    temperature: float = 25.0,
    wind_speed: float = 2.0,
    temp_coeff: float = -0.004,
    performance_ratio: float = 0.84,
) -> float:
    """
    High-accuracy PV power generation model incorporating:
      - Solar Irradiance (GHI in W/m²)
      - Ambient Temperature (°C)
      - Wind Speed (m/s) convective cooling
      - PV Cell Temperature derating (temperature coefficient ~ -0.4%/°C)
      - Inverter & System Performance Ratio (PR)

    Args:
        ghi: Global Horizontal Irradiance (W/m²)
        panel_capacity_kw: Rated panel capacity in kW
        temperature: Ambient air temperature in °C
        wind_speed: Wind speed at 10m in m/s
        temp_coeff: Temperature coefficient of power (default -0.4% / °C)
        performance_ratio: System performance ratio (default 84%)

    Returns:
        Estimated power generation in kW for that hour
    """
    if ghi <= 5.0 or panel_capacity_kw <= 0:
        return 0.0

    # 1. Calculate cell temperature accounting for wind cooling
    t_cell = calculate_cell_temperature(temperature, ghi, wind_speed)

    # 2. Temperature derating factor (standard test condition is 25°C)
    # Cells hotter than 25°C lose efficiency, cooler cells gain efficiency
    temp_loss_factor = max(0.6, 1.0 + temp_coeff * (t_cell - 25.0))

    # 3. Electrical power generation
    # P = P_STC * (GHI / 1000) * temp_loss_factor * PR
    effective_gen = panel_capacity_kw * (ghi / 1000.0) * temp_loss_factor * performance_ratio

    # Cap at rated capacity
    return max(0.0, min(effective_gen, panel_capacity_kw))


