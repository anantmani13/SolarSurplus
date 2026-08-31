"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel, Field
from typing import Optional


class UserInput(BaseModel):
    """User's solar + battery system configuration."""
    solar_panel_capacity_kw: float = Field(..., gt=0, description="Solar panel capacity in kW")
    battery_capacity_kwh: float = Field(..., gt=0, description="Battery capacity in kWh")
    current_battery_charge: float = Field(
        default=50.0, ge=0, le=100,
        description="Current battery state of charge (%)"
    )
    panel_age_years: float = Field(default=0, ge=0, description="Age of solar panels in years")
    battery_age_years: float = Field(default=0, ge=0, description="Age of battery in years")
    latitude: float = Field(..., ge=-90, le=90, description="Location latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Location longitude")
    avg_daily_consumption_kwh: float = Field(
        default=10.0, gt=0,
        description="Average daily energy consumption in kWh"
    )


class HourlyForecast(BaseModel):
    """Single hour forecast entry."""
    hour: int
    timestamp: str
    temperature: float
    cloud_cover: float
    ghi: float  # Global Horizontal Irradiance
    dni: float  # Direct Normal Irradiance
    dhi: float  # Diffuse Horizontal Irradiance
    predicted_generation_kwh: float
    estimated_consumption_kwh: float
    surplus_kwh: float
    battery_action: str  # "charge", "discharge", "idle"
    battery_charge_kwh: float
    battery_soc_percent: float


class PredictionResponse(BaseModel):
    """Complete forecast response."""
    location: dict
    system_info: dict
    hourly_forecast: list[HourlyForecast]
    daily_summary: dict
    recommendations: list[str]
    model_used: str = "XGBoost + Weather API"


class WeatherForecast(BaseModel):
    """Weather forecast response."""
    latitude: float
    longitude: float
    timezone: str
    hourly: list[dict]
    daily_summary: Optional[dict] = None
