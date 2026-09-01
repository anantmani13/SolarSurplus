import { useEffect, useRef, useState } from 'react';
import { BatteryCharging, BatteryMedium, BatteryFull, BatteryLow, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ACTION_STYLES = {
  charging: { label: 'Charging', color: '#10B981', Icon: ArrowUpRight },
  discharging: { label: 'Discharging', color: '#F59E0B', Icon: ArrowDownRight },
  idle: { label: 'Idle', color: '#3B82F6', Icon: ArrowUpRight },
  low: { label: 'Low Battery', color: '#EF4444', Icon: ArrowUpRight },
};

export default function BatteryStatus({ soc = 50, action = 'idle', capacityKwh = 10, chargeKwh = 5 }) {
  const [displaySoc, setDisplaySoc] = useState(soc);
  const prevSoc = useRef(soc);

  useEffect(() => {
    const from = prevSoc.current;
    const to = Math.max(0, Math.min(100, soc));
    const duration = 700;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplaySoc(from + (to - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevSoc.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [soc]);

  const clampedSoc = Math.min(100, Math.max(0, displaySoc));
  const isLow = soc < 20;
  const statusKey = isLow ? 'low' : action;
  const status = ACTION_STYLES[statusKey] || ACTION_STYLES.idle;

  const BatteryIcon = isLow ? BatteryLow : soc < 60 ? BatteryMedium : BatteryFull;

  const batteryPercent = Math.min(100, Math.max(2, clampedSoc));

  return (
    <div className="glass-card battery-card">
      <div className="battery-header">
        <div>
          <h3 className="chart-title" style={{ marginBottom: 4 }}>Battery Status</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>State of charge now</p>
        </div>
        <span
          className="battery-chip"
          style={{ color: status.color, borderColor: `${status.color}66`, background: `${status.color}1A` }}
        >
          <span
            className={`battery-dot ${action}`}
            style={{ background: status.color, boxShadow: `0 0 8px ${status.color}` }}
          />
          {status.label}
        </span>
      </div>

      <div className={`battery-visual battery-visual-${action}`}>
        <div className="battery-tip" />
        <div className={`battery-outer ${action}`}>
          <div className="battery-fill-glow" style={{ opacity: isLow ? 0.4 : 1 }} />
          <div className={`battery-fill ${statusKey}`} style={{ height: `${batteryPercent}%` }}>
            <div className="battery-wave battery-wave-a" />
            <div className="battery-wave battery-wave-b" />
            {action === 'charging' && (
              <>
                <span className="battery-bubble" style={{ left: '28%', animationDelay: '0s' }} />
                <span className="battery-bubble" style={{ left: '52%', animationDelay: '0.7s' }} />
                <span className="battery-bubble" style={{ left: '72%', animationDelay: '1.4s' }} />
              </>
            )}
            {action === 'discharging' && (
              <>
                <span className="battery-drip" style={{ left: '42%', animationDelay: '0.3s' }} />
                <span className="battery-drip" style={{ left: '65%', animationDelay: '1s' }} />
              </>
            )}
          </div>
          <div className="battery-percent">
            <span style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>{status.label}</span>
            <span>{Math.round(clampedSoc)}%</span>
          </div>
        </div>
      </div>

      <div className="battery-flowbar">
        <div className="battery-flow-item">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BatteryIcon size={12} /> Stored
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{chargeKwh.toFixed(1)} kWh</div>
        </div>
        <div className="battery-flow-item battery-flow-mid">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} /> Capacity
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{capacityKwh.toFixed(1)} kWh</div>
        </div>
        <div className="battery-flow-item">
          <status.Icon size={16} style={{ color: status.color }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Action</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: status.color }}>{status.label}</div>
        </div>
      </div>
    </div>
  );
}