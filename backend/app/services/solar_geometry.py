"""
Solar geometry — adjusts irradiance for panel tilt and azimuth.

Takes flat-plane GHI/DNI/DHI from weather and projects it onto an
inclined module plane (Isotropic sky + direct-beam projection), so a
south-facing 30° roof in India gets a higher effective GHI than a flat
panel, and a north-facing one gets less.

References: NOAA solar position equations; Liu–Jordan isotropic diffuse model.
"""

import math
from datetime import datetime


def _is_leap(year: int) -> bool:
    return (year % 4 == 0 and year % 100 != 0) or year % 400 == 0


def _day_of_year(dt: datetime) -> int:
    return dt.timetuple().tm_yday


def solar_declination(doy: int) -> float:
    """Solar declination in degrees (NOAA approximation)."""
    return 23.44 * math.sin(math.radians(360 * (284 + doy) / 365.25))


def solar_position(dt: datetime, latitude: float, longitude: float):
    """
    Returns (elevation_deg, azimuth_from_north_deg) for a local civil time.
    Note: input timestamps are local (Open-Meteo returns local time), which is
    accurate enough for the small geometry corrections we apply.
    """
    phi = math.radians(latitude)
    doy = _day_of_year(dt)
    delta = math.radians(solar_declination(doy))

    # Hour angle: solar noon offset, 15°/hour
    hour = dt.hour + dt.minute / 60.0
    h = math.radians((hour - 12.0) * 15.0)

    sin_alpha = math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.cos(h)
    alpha = math.asin(max(-1.0, min(1.0, sin_alpha)))

    # Solar azimuth bearing from North, clockwise (east = 90)
    if abs(math.cos(alpha)) < 1e-6:
        beta = math.pi * (0.0 if h <= 0 else 1.0)
    else:
        sin_beta = (-math.cos(delta) * math.sin(h)) / math.cos(alpha)
        cos_beta = (math.sin(delta) - sin_alpha * math.sin(phi)) / (math.cos(alpha) * math.cos(phi))
        beta = math.atan2(sin_beta, cos_beta)

    return math.degrees(alpha), math.degrees(beta) % 360.0


def _cos_incidence(alpha_deg: float, beta_deg: float, tilt_deg: float, azimuth_deg: float) -> float:
    """Cosine of incidence angle between sun ray and module normal."""
    alpha = math.radians(alpha_deg)
    beta = math.radians(beta_deg)
    tilt = math.radians(tilt_deg)
    az = math.radians(azimuth_deg)

    # Module normal (east, north, up): facing azimuth (0=N, 90=E, 180=S, 270=W)
    nx = math.sin(tilt) * math.sin(az)
    ny = math.sin(tilt) * math.cos(az)
    nz = math.cos(tilt)

    # Sun unit vector (east, north, up)
    sx = math.cos(alpha) * math.sin(beta)
    sy = math.cos(alpha) * math.cos(beta)
    sz = math.sin(alpha)

    return max(0.0, sx * nx + sy * ny + sz * nz)


def tilt_irradiance(hour: dict, latitude: float, longitude: float, tilt_deg: float, azimuth_deg: float, albedo: float = 0.2) -> dict:
    """
    Returns a copy of `hour` with GHI/DNI/DHI projected onto the tilted plane.
    tilt_deg <= 0 returns the input unchanged (flat/ignored).
    """
    if tilt_deg <= 0 or not hour.get("timestamp"):
        return hour

    try:
        dt = datetime.fromisoformat(hour["timestamp"].replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)
    except (ValueError, TypeError):
        return hour

    ghi = float(hour.get("ghi", 0))
    dni = float(hour.get("dni", 0)) or (ghi * 0.82)
    dhi = float(hour.get("dhi", 0)) or (ghi * 0.15)

    alpha_deg, beta_deg = solar_position(dt, latitude, longitude)
    alpha_rad = math.radians(alpha_deg)
    if math.sin(alpha_rad) < 0.05:
        out = dict(hour)
        out["ghi"] = 0.0
        out["dni"] = 0.0
        out["dhi"] = 0.0
        return out

    cos_inc = _cos_incidence(alpha_deg, beta_deg, tilt_deg, azimuth_deg)
    tilt = math.radians(tilt_deg)

    beam_tilt = dni * cos_inc / math.sin(alpha_rad)
    diff_tilt = dhi * (1 + math.cos(tilt)) / 2.0
    ground = ghi * albedo * (1 - math.cos(tilt)) / 2.0
    ghi_tilt = max(0.0, beam_tilt + diff_tilt + ground)

    out = dict(hour)
    out["ghi"] = round(ghi_tilt, 2)
    out["dni"] = round(beam_tilt / math.sin(alpha_rad) if math.sin(alpha_rad) > 0 else 0.0, 2)
    out["dhi"] = round(diff_tilt + ground, 2)
    out["tilt_deg"] = tilt_deg
    out["azimuth_deg"] = azimuth_deg
    out["solar_elevation_deg"] = round(alpha_deg, 1)
    return out