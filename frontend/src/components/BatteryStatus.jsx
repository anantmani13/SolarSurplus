import { useEffect, useRef, useState } from 'react';
import { BatteryCharging, BatteryMedium, BatteryFull, BatteryLow, ArrowUpRight, ArrowDownRight, Activity, Zap } from 'lucide-react';

const ACTION_STYLES = {
  charging: { label: 'Charging', color: '#10B981', Icon: ArrowUpRight },
  discharging: { label: 'Discharging', color: '#F59E0B', Icon: ArrowDownRight },
  idle: { label: 'Idle', color: '#3B82F6', Icon: Activity },
  low: { label: 'Low Battery', color: '#EF4444', Icon: ArrowUpRight },
};

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 120;
  const h = 34;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(1, max - min);
  const pts = data.map((v, i) => [
    pad + (i * (w - 2 * pad)) / (data.length - 1),
    pad + (h - 2 * pad) * (1 - (v - min) / range),
  ]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w - pad},${h} L${pad},${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="socArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#socArea)" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} className="spark-pulse" />
    </svg>
  );
}

export default function BatteryStatus({ soc = 50, action = 'idle', capacityKwh = 10, chargeKwh = 5, socHistory = [] }) {
  const [displaySoc, setDisplaySoc] = useState(soc);
  const prevSoc = useRef(soc);

  useEffect(() => {
    const from = prevSoc.current;
    const to = Math.max(0, Math.min(100, soc));
    const duration = 800;
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
  const last24 = socHistory.length ? socHistory : [];

  return (
    <div className="glass-card battery-card">
      <div className="battery-header">
        <div>
          <h3 className="chart-title" style={{ marginBottom: 4 }}>Battery Status</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live state of charge</p>
        </div>
        <span
          className="battery-chip"
          style={{ color: status.color, borderColor: `${status.color}66`, background: `${status.color}1A` }}
        >
          <span className={`battery-dot ${action}`} style={{ background: status.color, boxShadow: `0 0 8px ${status.color}` }} />
          {status.label}
        </span>
      </div>

      <div className={`battery-visual battery-visual-${action}`}>
        <div className="battery-tip" />
        <div className={`battery-outer ${action}`}>
          <div className="battery-ticks" />
          <div className={`battery-fill ${statusKey}`} style={{ height: `${batteryPercent}%` }}>
            <div className="battery-wave battery-wave-a" />
            <div className="battery-wave battery-wave-b" />
            {action === 'charging' && (
              <>
                <span className="battery-bubble" style={{ left: '26%', animationDelay: '0s' }} />
                <span className="battery-bubble" style={{ left: '50%', animationDelay: '0.8s' }} />
                <span className="battery-bubble" style={{ left: '70%', animationDelay: '1.6s' }} />
              </>
            )}
            {action === 'discharging' && (
              <>
                <span className="battery-drip" style={{ left: '40%', animationDelay: '0.3s' }} />
                <span className="battery-drip" style={{ left: '63%', animationDelay: '1.1s' }} />
              </>
            )}
          </div>
          <div className="battery-shine" />
          <div className="battery-percent">
            <span style={{ color: status.color }}>{status.label}</span>
            <span>{Math.round(clampedSoc)}%</span>
          </div>
        </div>
      </div>

      {last24.length >= 2 && (
        <div className="battery-trend">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Activity size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>SoC — last 24h</span>
            <span style={{ fontSize: 11, marginLeft: 'auto', color: status.color, fontWeight: 700 }}>
              {((last24[last24.length - 1] || 0) - (last24[0] || 0) >= 0 ? '+' : '')}
              {((last24[last24.length - 1] || 0) - (last24[0] || 0)).toFixed(0)}%
            </span>
          </div>
          <div style={{ height: 40 }}>
            <Sparkline data={last24} color={status.color} />
          </div>
        </div>
      )}

      <div className="battery-flowbar">
        <div className="battery-flow-item">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BatteryIcon size={12} /> Stored
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{chargeKwh.toFixed(1)} kWh</div>
        </div>
        <div className="battery-flow-item">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} /> Capacity
          </div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{capacityKwh.toFixed(1)} kWh</div>
        </div>
        <div className="battery-flow-item">
          <status.Icon size={15} style={{ color: status.color }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Action</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: status.color }}>{status.label}</div>
        </div>
      </div>
    </div>
  );
}