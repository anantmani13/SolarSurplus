"""Utility helpers for the ML pipeline."""


def solar_panel_degradation(base_capacity_kw: float, age_years: float) -> float:
    """
    Calculate effective solar panel capacity accounting for age degradation.
    Industry standard: ~0.5% efficiency loss per year.
    """
    degradation_rate = 0.005  # 0.5% per year
    factor = max(0.0, 1.0 - degradation_rate * age_years)
    return base_capacity_kw * factor


def battery_degradation(rated_capacity_kwh: float, age_years: float) -> float:
    """
    Calculate effective battery capacity accounting for age degradation.
    Industry standard: ~2% capacity loss per year for lithium-ion.
    """
    degradation_rate = 0.02  # 2% per year
    factor = max(0.0, 1.0 - degradation_rate * age_years)
    return rated_capacity_kwh * factor
