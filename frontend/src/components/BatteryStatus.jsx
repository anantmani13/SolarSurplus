import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium } from 'lucide-react';

export default function BatteryStatus({ soc = 50, action = 'idle', capacityKwh = 10, chargeKwh = 5 }) {
  const getStatusClass = () => {
    if (soc < 20) return 'low';
    return action;
  };

  const getStatusLabel = () => {
    if (soc < 20) return '⚠️ Low Battery';
    if (action === 'charging') return '⚡ Charging';
    if (action === 'discharging') return '🔋 Discharging';
    return '💤 Idle';
  };

  const getIcon = () => {
    if (action === 'charging') return <BatteryCharging size={24} />;
    if (soc < 20) return <BatteryLow size={24} />;
    if (soc < 60) return <BatteryMedium size={24} />;
    return <BatteryFull size={24} />;
  };

  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <h3 className="chart-title">Battery Status</h3>

      <div className="battery-gauge">
        <div className="battery-tip" />
        <div className="battery-outer">
          <div
            className={`battery-fill ${getStatusClass()}`}
            style={{ height: `${Math.min(100, Math.max(2, soc))}%` }}
          />
          <div className="battery-percent">{Math.round(soc)}%</div>
        </div>
      </div>

      <div className={`battery-status ${getStatusClass()}`} style={{ marginTop: 16 }}>
        {getStatusLabel()}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Stored</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{chargeKwh.toFixed(1)} kWh</div>
        </div>
        <div style={{ width: 1, background: 'var(--border-color)' }} />
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Capacity</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{capacityKwh.toFixed(1)} kWh</div>
        </div>
      </div>
    </div>
  );
}
