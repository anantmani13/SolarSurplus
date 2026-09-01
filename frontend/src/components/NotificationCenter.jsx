import { useState, useEffect } from 'react';
import { Bell, Zap, Sun, AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { getTariffForCoordinates } from '../data/tariffData';

const SEVERITY_META = {
  info: { icon: Info, color: 'var(--blue-400)', label: 'Info' },
  success: { icon: CheckCircle, color: 'var(--emerald-400)', label: 'Good News' },
  warning: { icon: AlertTriangle, color: 'var(--amber-400)', label: 'Heads Up' },
  critical: { icon: AlertTriangle, color: 'var(--red-400)', label: 'Action Needed' },
};

const nowLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
  ' · ' +
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function NotificationCenter({ predictions, location }) {
  const [tariffRate, setTariffRate] = useState(3.0);
  const [stateName, setStateName] = useState(null);

  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;
    let cancelled = false;
    getTariffForCoordinates(location.latitude, location.longitude).then((res) => {
      if (!cancelled) {
        setTariffRate(res.tariff?.rate ?? 3.0);
        setStateName(res.state || null);
      }
    });
    return () => { cancelled = true; };
  }, [location?.latitude, location?.longitude]);

  const notifications = [];

  if (predictions?.daily_summary) {
    const summary = predictions.daily_summary;

    if (summary.total_surplus_kwh > 0) {
      notifications.push({
        severity: 'success',
        title: 'Surplus Energy Detected',
        message: `Your system will generate ${summary.total_surplus_kwh.toFixed(1)} kWh surplus energy over the forecast period. Store it in the battery or use high-power appliances during peak hours.`,
        time: nowLabel(),
      });
    }

    if (summary.grid_export_kwh > 0) {
      const dailyExport = summary.grid_export_kwh / (summary.forecast_days || 7);
      notifications.push({
        severity: 'success',
        title: 'Grid Export Opportunity',
        message: `You have ~${dailyExport.toFixed(1)} kWh/day of exportable surplus. Under net metering this could earn ≈ ₹${(dailyExport * tariffRate).toFixed(1)}/day${stateName ? ` at ${stateName}'s rate` : ''}.`,
        time: nowLabel(),
      });
    }

    if (summary.self_sufficiency_percent >= 100) {
      notifications.push({
        severity: 'success',
        title: 'Fully Self-Sufficient!',
        message: `Your solar system covers ${summary.self_sufficiency_percent.toFixed(0)}% of your consumption. You're energy independent! Consider net metering to earn from surplus.`,
        time: nowLabel(),
      });
    } else if (summary.self_sufficiency_percent < 50) {
      notifications.push({
        severity: 'warning',
        title: 'Low Self-Sufficiency',
        message: `Your system only covers ${summary.self_sufficiency_percent.toFixed(0)}% of consumption. Consider reducing usage during non-solar hours or expanding panel capacity.`,
        time: nowLabel(),
      });
    }

    if (summary.battery_degradation_percent > 10) {
      notifications.push({
        severity: 'warning',
        title: 'Battery Degradation Notice',
        message: `Your battery has degraded by ${summary.battery_degradation_percent.toFixed(1)}%. Usable capacity is now ${summary.usable_battery_capacity_kwh.toFixed(1)} kWh.`,
        time: nowLabel(),
      });
    }

    if (summary.final_battery_soc_percent < 30) {
      notifications.push({
        severity: 'critical',
        title: 'Low Battery Forecast',
        message: `Battery is projected to reach ${summary.final_battery_soc_percent.toFixed(0)}% by end of forecast. Reduce evening consumption to preserve charge.`,
        time: nowLabel(),
      });
    }
  }

  if (predictions?.hourly_forecast?.length) {
    const hourly = predictions.hourly_forecast;

    // Peak solar window (avg generation by hour of day)
    const genByHour = {};
    hourly.forEach((h) => {
      const hh = h.hour_of_day ?? (h.hour % 24);
      (genByHour[hh] = genByHour[hh] || []).push(h.predicted_generation_kwh || h.generation_kwh || 0);
    });
    const avgByHour = Object.entries(genByHour)
      .map(([hh, vals]) => ({ hh: Number(hh), avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .filter((x) => x.avg > 0)
      .sort((a, b) => b.avg - a.avg);
    if (avgByHour.length >= 3) {
      const peak = avgByHour.slice(0, 4);
      const start = Math.min(...peak.map((p) => p.hh));
      const end = Math.max(...peak.map((p) => p.hh));
      const maxHour = avgByHour[0];
      notifications.push({
        severity: 'info',
        title: 'Peak Solar Window',
        message: `Solar generation peaks between ${start}:00 – ${end}:00 (~${maxHour.avg.toFixed(1)} kWh/hr). Schedule charging and heavy appliances now.`,
        time: nowLabel(),
      });
    }

    // Battery-full alert
    const solarHours = hourly.filter((h) => new Date(h.timestamp).getDate() === new Date(hourly[0].timestamp).getDate());
    const fullHour = solarHours.find((h) => (h.battery_soc_percent || 0) >= 99);
    if (fullHour) {
      const t = new Date(fullHour.timestamp);
      notifications.push({
        severity: 'info',
        title: 'Battery Full Alert',
        message: `Battery reaches ~100% by ${t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Surplus generated after that will be exported${summaryNoGrid() ? ' — wasted without net metering' : ''}.`,
        time: nowLabel(),
      });
    }

    // Weather impact: heavy cloud cover
    const cloudy = hourly.filter((h) => (h.cloud_cover || 0) > 60);
    if (cloudy.length >= 6) {
      const avgCloud = cloudy.reduce((a, b) => a + b.cloud_cover, 0) / cloudy.length;
      const drop = Math.min(60, Math.round((avgCloud - 60) * 1.2));
      notifications.push({
        severity: 'warning',
        title: 'Weather Impact',
        message: `Cloud cover is expected above ${Math.round(avgCloud)}% in several hours — generation may drop by up to ~${drop}% then. Charge early to ride through it.`,
        time: nowLabel(),
      });
    }

    // Best discharge windows
    const dischargeHours = hourly.filter((h) => h.battery_action === 'discharge').slice(0, 5);
    if (dischargeHours.length > 0) {
      const times = dischargeHours
        .map((h) => new Date(h.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
        .join(', ');
      notifications.push({
        severity: 'info',
        title: 'Optimal Battery Usage Windows',
        message: `Best times to use battery power: ${times}. These are your highest-deficit periods when grid power is most expensive.`,
        time: nowLabel(),
      });
    }
  }

  function summaryNoGrid() {
    return !(predictions?.daily_summary?.grid_export_kwh > 0);
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card">
        <h3 className="chart-title">
          <Bell size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Energy Alerts
        </h3>
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No alerts yet</h3>
          <p>Generate a forecast to receive energy optimization alerts</p>
        </div>
      </div>
    );
  }

  // Severity ordering: critical → warning → info → success
  const order = { critical: 0, warning: 1, info: 2, success: 3 };
  const sorted = [...notifications].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="chart-title" style={{ margin: 0 }}>
          <Bell size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Energy Alerts
        </h3>
        <span className="badge badge-emerald">{sorted.length} alerts</span>
      </div>

      {sorted.map((notif, i) => {
        const meta = SEVERITY_META[notif.severity] || SEVERITY_META.info;
        const Icon = notif.severity === 'info' ? Sun : notif.severity === 'success' ? Zap : notif.severity === 'critical' ? AlertTriangle : TrendingUp;
        return (
          <div
            key={i}
            className={`notification-item slide-up severity-${notif.severity}`}
            style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
          >
            <div className={`notification-icon ${notif.severity}`}>
              <Icon size={16} />
            </div>
            <div className="notification-content">
              <h4>
                {notif.title}
                <span className="badge severity-badge" style={{ marginLeft: 8, color: meta.color, border: `1px solid ${meta.color}55`, background: 'transparent', fontSize: 10 }}>
                  {meta.label}
                </span>
              </h4>
              <p>{notif.message}</p>
            </div>
            <span className="notification-time">{notif.time}</span>
          </div>
        );
      })}
    </div>
  );
}