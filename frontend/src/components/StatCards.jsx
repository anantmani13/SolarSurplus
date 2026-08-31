import { Sun, Battery, Zap, TrendingUp, ArrowDown, ArrowUp } from 'lucide-react';

export default function StatCards({ summary }) {
  if (!summary) return null;

  const cards = [
    {
      icon: <Sun size={20} />,
      iconClass: 'emerald',
      label: 'Total Generation',
      value: `${summary.total_generation_kwh?.toFixed(1)} kWh`,
      change: `${summary.forecast_days} day forecast`,
      changeClass: '',
    },
    {
      icon: <Zap size={20} />,
      iconClass: 'amber',
      label: 'Total Consumption',
      value: `${summary.total_consumption_kwh?.toFixed(1)} kWh`,
      change: `${summary.net_energy_kwh >= 0 ? '+' : ''}${summary.net_energy_kwh?.toFixed(1)} kWh net`,
      changeClass: summary.net_energy_kwh >= 0 ? 'positive' : 'negative',
    },
    {
      icon: <TrendingUp size={20} />,
      iconClass: 'blue',
      label: 'Self-Sufficiency',
      value: `${summary.self_sufficiency_percent?.toFixed(0)}%`,
      change: summary.self_sufficiency_percent >= 100 ? 'Fully self-sufficient' : 'Grid supplement needed',
      changeClass: summary.self_sufficiency_percent >= 80 ? 'positive' : 'negative',
    },
    {
      icon: <Battery size={20} />,
      iconClass: summary.final_battery_soc_percent > 50 ? 'emerald' : 'red',
      label: 'Final Battery SoC',
      value: `${summary.final_battery_soc_percent?.toFixed(0)}%`,
      change: `${summary.usable_battery_capacity_kwh?.toFixed(1)} kWh usable`,
      changeClass: summary.final_battery_soc_percent > 50 ? 'positive' : 'negative',
    },
  ];

  return (
    <div className="grid-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`glass-card stat-card slide-up stagger-${i + 1}`}
          style={{ animationFillMode: 'both' }}
        >
          <div className="stat-card-header">
            <div className={`stat-card-icon ${card.iconClass}`}>{card.icon}</div>
          </div>
          <div className="stat-card-label">{card.label}</div>
          <div className="stat-card-value">{card.value}</div>
          <div className={`stat-card-change ${card.changeClass}`}>{card.change}</div>
        </div>
      ))}
    </div>
  );
}
