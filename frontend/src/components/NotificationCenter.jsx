import { useState, useEffect } from 'react';
import { Bell, Zap, Sun, AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { getTariffForCoordinates } from '../data/tariffData';
import { useI18n, f } from '../i18n';

const SEVERITY_META = (t) => ({
  info: { icon: Info, color: 'var(--blue-400)', label: t('sev.info') },
  success: { icon: CheckCircle, color: 'var(--emerald-400)', label: t('sev.success') },
  warning: { icon: AlertTriangle, color: 'var(--amber-400)', label: t('sev.warning') },
  critical: { icon: AlertTriangle, color: 'var(--red-400)', label: t('sev.critical') },
});

const nowLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
  ' · ' +
  new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function NotificationCenter({ predictions, location }) {
  const { t } = useI18n();
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
        title: t('note.surplus.title'),
        message: f(t('note.surplus.msg'), { v: summary.total_surplus_kwh.toFixed(1) }),
        time: nowLabel(),
      });
    }

    if (summary.grid_export_kwh > 0) {
      const dailyExport = summary.grid_export_kwh / (summary.forecast_days || 7);
      notifications.push({
        severity: 'success',
        title: t('note.export.title'),
        message: f(t('note.export.msg'), {
          v: dailyExport.toFixed(1),
          r: (dailyExport * tariffRate).toFixed(1),
          s: stateName ? f(t('note.export.state'), { s: stateName }) : '',
        }),
        time: nowLabel(),
      });
    }

    if (summary.self_sufficiency_percent >= 100) {
      notifications.push({
        severity: 'success',
        title: t('note.full.title'),
        message: f(t('note.full.msg'), { v: summary.self_sufficiency_percent.toFixed(0) }),
        time: nowLabel(),
      });
    } else if (summary.self_sufficiency_percent < 50) {
      notifications.push({
        severity: 'warning',
        title: t('note.lowself.title'),
        message: f(t('note.lowself.msg'), { v: summary.self_sufficiency_percent.toFixed(0) }),
        time: nowLabel(),
      });
    }

    if (summary.battery_degradation_percent > 10) {
      notifications.push({
        severity: 'warning',
        title: t('note.degrade.title'),
        message: f(t('note.degrade.msg'), {
          v: summary.battery_degradation_percent.toFixed(1),
          c: summary.usable_battery_capacity_kwh.toFixed(1),
        }),
        time: nowLabel(),
      });
    }

    if (summary.final_battery_soc_percent < 30) {
      notifications.push({
        severity: 'critical',
        title: t('note.lowbatt.title'),
        message: f(t('note.lowbatt.msg'), { v: summary.final_battery_soc_percent.toFixed(0) }),
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
        title: t('note.peak.title'),
        message: f(t('note.peak.msg'), { s: start, e: end, v: maxHour.avg.toFixed(1) }),
        time: nowLabel(),
      });
    }

    // Battery-full alert
    const solarHours = hourly.filter((h) => new Date(h.timestamp).getDate() === new Date(hourly[0].timestamp).getDate());
    const fullHour = solarHours.find((h) => (h.battery_soc_percent || 0) >= 99);
    if (fullHour) {
      const tfull = new Date(fullHour.timestamp);
      notifications.push({
        severity: 'info',
        title: t('note.battfull.title'),
        message: f(t('note.battfull.msg'), {
          t: tfull.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          w: summaryNoGrid() ? t('note.battfull.waste') : '',
        }),
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
        title: t('note.weather.title'),
        message: f(t('note.weather.msg'), { v: Math.round(avgCloud), d: drop }),
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
        title: t('note.windows.title'),
        message: f(t('note.windows.msg'), { t: times }),
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
          {t('alerts.title')}
        </h3>
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>{t('alerts.empty.title')}</h3>
          <p>{t('alerts.empty.text')}</p>
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
          {t('alerts.title')}
        </h3>
        <span className="badge badge-emerald">{f(t('alerts.count'), { n: sorted.length })}</span>
      </div>

      {sorted.map((notif, i) => {
        const meta = SEVERITY_META(t)[notif.severity] || SEVERITY_META(t).info;
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