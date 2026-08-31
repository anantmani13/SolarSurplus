"""
Battery Optimizer Service.

Calculates surplus energy, manages battery charge/discharge schedule,
and generates usage recommendations based on forecast data.
"""


def calculate_battery_schedule(
    hourly_generation: list[float],
    avg_daily_consumption_kwh: float,
    battery_capacity_kwh: float,
    current_charge_percent: float,
    battery_age_years: float = 0,
) -> dict:
    """
    Calculate optimal battery charge/discharge schedule.

    Logic:
    - Distribute daily consumption across hours (weighted by typical usage pattern)
    - When generation > consumption → surplus → charge battery
    - When generation < consumption → deficit → discharge battery
    - Respect battery limits: min 20% SoC, max 100% SoC

    Args:
        hourly_generation: Predicted kWh per hour
        avg_daily_consumption_kwh: Average daily consumption in kWh
        battery_capacity_kwh: Rated battery capacity in kWh
        current_charge_percent: Current SoC (0-100%)
        battery_age_years: Battery age for degradation calculation

    Returns:
        Dict with hourly schedule, summary, and recommendations
    """
    # Battery degradation: 2% capacity loss per year
    degradation_factor = max(0.0, 1.0 - 0.02 * battery_age_years)
    usable_capacity = battery_capacity_kwh * degradation_factor

    # Minimum SoC to preserve battery health
    min_soc_percent = 20.0
    min_charge_kwh = usable_capacity * (min_soc_percent / 100)
    max_charge_kwh = usable_capacity

    # Current charge in kWh
    current_charge_kwh = usable_capacity * (current_charge_percent / 100)

    # Typical hourly consumption pattern (normalized to sum to 1.0)
    # Higher in morning (6-9) and evening (17-22), lower at night
    consumption_pattern = [
        0.02, 0.02, 0.02, 0.02, 0.02, 0.03,  # 0-5 (night)
        0.05, 0.06, 0.06, 0.05, 0.04, 0.04,  # 6-11 (morning)
        0.04, 0.04, 0.04, 0.04, 0.05, 0.06,  # 12-17 (afternoon)
        0.07, 0.07, 0.06, 0.05, 0.04, 0.03,  # 18-23 (evening)
    ]

    schedule = []
    charge_kwh = current_charge_kwh
    total_surplus = 0
    total_deficit = 0
    total_generated = 0
    total_consumed = 0

    hours_in_forecast = len(hourly_generation)
    num_days = max(1, hours_in_forecast / 24)

    for i, gen_kwh in enumerate(hourly_generation):
        hour_of_day = i % 24

        # Estimated consumption for this hour
        consumption_kwh = avg_daily_consumption_kwh * consumption_pattern[hour_of_day]

        # Net energy balance
        net = gen_kwh - consumption_kwh
        surplus = max(0, net)
        deficit = max(0, -net)

        action = "idle"
        energy_flow = 0.0

        if surplus > 0:
            # Charge battery with surplus (95% charging efficiency)
            charge_efficiency = 0.95
            can_charge = max_charge_kwh - charge_kwh
            actual_charge = min(surplus * charge_efficiency, can_charge)

            if actual_charge > 0.01:
                charge_kwh += actual_charge
                action = "charge"
                energy_flow = actual_charge
            total_surplus += surplus

        elif deficit > 0:
            # Discharge battery to cover deficit (95% discharge efficiency)
            discharge_efficiency = 0.95
            available = (charge_kwh - min_charge_kwh) * discharge_efficiency
            actual_discharge = min(deficit, available)

            if actual_discharge > 0.01:
                charge_kwh -= actual_discharge / discharge_efficiency
                action = "discharge"
                energy_flow = actual_discharge
            total_deficit += deficit

        total_generated += gen_kwh
        total_consumed += consumption_kwh

        soc_percent = (charge_kwh / usable_capacity * 100) if usable_capacity > 0 else 0

        schedule.append({
            "hour_index": i,
            "hour_of_day": hour_of_day,
            "generation_kwh": round(gen_kwh, 3),
            "consumption_kwh": round(consumption_kwh, 3),
            "surplus_kwh": round(surplus, 3),
            "deficit_kwh": round(deficit, 3),
            "battery_action": action,
            "energy_flow_kwh": round(energy_flow, 3),
            "battery_charge_kwh": round(charge_kwh, 3),
            "battery_soc_percent": round(soc_percent, 1),
        })

    # Generate recommendations
    recommendations = _generate_recommendations(
        schedule, total_surplus, total_deficit,
        total_generated, total_consumed,
        usable_capacity, charge_kwh, num_days,
    )

    # Daily summary
    daily_summary = {
        "total_generation_kwh": round(total_generated, 2),
        "total_consumption_kwh": round(total_consumed, 2),
        "total_surplus_kwh": round(total_surplus, 2),
        "total_deficit_kwh": round(total_deficit, 2),
        "net_energy_kwh": round(total_generated - total_consumed, 2),
        "self_sufficiency_percent": round(
            min(100, (total_generated / max(total_consumed, 0.01)) * 100), 1
        ),
        "final_battery_soc_percent": round(
            (charge_kwh / usable_capacity * 100) if usable_capacity > 0 else 0, 1
        ),
        "usable_battery_capacity_kwh": round(usable_capacity, 2),
        "battery_degradation_percent": round((1 - degradation_factor) * 100, 1),
        "forecast_days": round(num_days, 1),
    }

    return {
        "schedule": schedule,
        "daily_summary": daily_summary,
        "recommendations": recommendations,
    }


def _generate_recommendations(
    schedule: list,
    total_surplus: float,
    total_deficit: float,
    total_generated: float,
    total_consumed: float,
    usable_capacity: float,
    final_charge: float,
    num_days: float,
) -> list[str]:
    """Generate actionable recommendations based on forecast."""
    recs = []

    # Find peak generation hours
    gen_by_hour = {}
    for entry in schedule:
        h = entry["hour_of_day"]
        gen_by_hour.setdefault(h, []).append(entry["generation_kwh"])

    avg_gen_by_hour = {h: sum(v) / len(v) for h, v in gen_by_hour.items()}
    peak_hours = sorted(avg_gen_by_hour, key=avg_gen_by_hour.get, reverse=True)[:4]
    peak_start = min(peak_hours)
    peak_end = max(peak_hours)

    recs.append(
        f"☀️ Peak solar generation: {peak_start}:00 – {peak_end}:00. "
        "Schedule high-consumption tasks (washing, AC) during these hours."
    )

    # Find best battery discharge hours
    discharge_hours = [e["hour_of_day"] for e in schedule if e["battery_action"] == "discharge"]
    if discharge_hours:
        from collections import Counter
        common_discharge = Counter(discharge_hours).most_common(3)
        hours_str = ", ".join(f"{h}:00" for h, _ in common_discharge)
        recs.append(
            f"🔋 Best times to use battery power: {hours_str}. "
            "Battery discharges during these deficit hours."
        )

    # Self-sufficiency advice
    self_suff = (total_generated / max(total_consumed, 0.01)) * 100
    if self_suff >= 100:
        recs.append(
            f"✅ Your system generates {self_suff:.0f}% of your consumption. "
            "You have surplus energy — consider net metering or selling back to the grid."
        )
    elif self_suff >= 70:
        recs.append(
            f"⚡ Your system covers {self_suff:.0f}% of consumption. "
            "Good self-sufficiency! Battery helps bridge the gap."
        )
    else:
        recs.append(
            f"⚠️ Your system covers only {self_suff:.0f}% of consumption. "
            "Consider increasing solar panel capacity or reducing consumption."
        )

    # Battery sizing advice
    daily_surplus = total_surplus / max(num_days, 1)
    if daily_surplus > usable_capacity * 0.5:
        recs.append(
            f"📈 Daily surplus ({daily_surplus:.1f} kWh) exceeds 50% of battery capacity. "
            "A larger battery could capture more free energy."
        )

    return recs
