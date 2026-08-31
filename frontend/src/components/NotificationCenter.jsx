import { useState } from 'react';
import { Bell, Zap, Sun, AlertTriangle, CheckCircle } from 'lucide-react';

export default function NotificationCenter({ predictions, notifications: savedNotifications }) {
  // Generate notifications from the latest prediction
  const notifications = [];

  if (predictions?.daily_summary) {
    const summary = predictions.daily_summary;

    if (summary.total_surplus_kwh > 0) {
      notifications.push({
        type: 'surplus',
        title: 'Surplus Energy Detected',
        message: `Your system will generate ${summary.total_surplus_kwh.toFixed(1)} kWh surplus energy over the forecast period. Consider storing it or using high-power appliances during peak hours.`,
        time: 'Just now',
      });
    }

    if (summary.self_sufficiency_percent >= 100) {
      notifications.push({
        type: 'surplus',
        title: 'Fully Self-Sufficient! 🎉',
        message: `Your solar system covers ${summary.self_sufficiency_percent.toFixed(0)}% of your consumption. You're energy independent!`,
        time: 'Just now',
      });
    } else if (summary.self_sufficiency_percent < 50) {
      notifications.push({
        type: 'warning',
        title: 'Low Self-Sufficiency',
        message: `Your system only covers ${summary.self_sufficiency_percent.toFixed(0)}% of consumption. Consider reducing usage during non-solar hours or expanding your panel capacity.`,
        time: 'Just now',
      });
    }

    if (summary.battery_degradation_percent > 10) {
      notifications.push({
        type: 'warning',
        title: 'Battery Degradation Notice',
        message: `Your battery has degraded by ${summary.battery_degradation_percent.toFixed(1)}%. Usable capacity is now ${summary.usable_battery_capacity_kwh.toFixed(1)} kWh.`,
        time: 'Just now',
      });
    }

    if (summary.final_battery_soc_percent < 30) {
      notifications.push({
        type: 'warning',
        title: 'Low Battery Forecast',
        message: `Battery is projected to reach ${summary.final_battery_soc_percent.toFixed(0)}% by end of forecast. Reduce evening consumption to preserve charge.`,
        time: 'Just now',
      });
    }
  }

  // Find best discharge times from schedule
  if (predictions?.hourly_forecast?.length) {
    const dischargeHours = predictions.hourly_forecast
      .filter(h => h.battery_action === 'discharge')
      .slice(0, 5);

    if (dischargeHours.length > 0) {
      const times = dischargeHours
        .map(h => {
          const d = new Date(h.timestamp);
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        })
        .join(', ');
      notifications.push({
        type: 'surplus',
        title: 'Optimal Battery Usage Windows',
        message: `Best times to use battery power: ${times}. These are your highest deficit periods.`,
        time: 'Just now',
      });
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="glass-card">
        <h3 className="chart-title">
          <Bell size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Notifications
        </h3>
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>No notifications yet</h3>
          <p>Generate a forecast to receive energy optimization alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 className="chart-title" style={{ margin: 0 }}>
          <Bell size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Notifications
        </h3>
        <span className="badge badge-emerald">{notifications.length} alerts</span>
      </div>

      {notifications.map((notif, i) => (
        <div
          key={i}
          className="notification-item slide-up"
          style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
        >
          <div className={`notification-icon ${notif.type}`}>
            {notif.type === 'surplus' ? <Zap size={16} /> : <AlertTriangle size={16} />}
          </div>
          <div className="notification-content">
            <h4>{notif.title}</h4>
            <p>{notif.message}</p>
          </div>
          <span className="notification-time">{notif.time}</span>
        </div>
      ))}
    </div>
  );
}
