import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useI18n } from '../i18n';

const CustomTooltip = ({ active, payload, label }) => {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13, marginBottom: 4 }}>
          {p.name}: <strong>{Number(p.value).toFixed(2)} kWh</strong>
        </p>
      ))}
      <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
        {t('surplus.soc')}: <strong>{payload[0]?.payload?.battery_soc?.toFixed(0)}%</strong> ({{
          charge: t('battery.charging'),
          discharge: t('battery.discharging'),
          idle: t('battery.idle'),
        }[payload[0]?.payload?.action] || t('battery.idle')})
      </p>
    </div>
  );
};

export default function SurplusTimeline({ data }) {
  const { t } = useI18n();
  if (!data?.length) return null;

  // Aggregate by hour of day across all forecast days
  const hourlyAgg = {};
  data.forEach((entry) => {
    const h = entry.hour_of_day ?? (entry.hour % 24);
    if (!hourlyAgg[h]) {
      hourlyAgg[h] = {
        surplus: [], stored: [], exported: [], wasted: [], deficits: [], socs: [], actions: [],
      };
    }
    const surplus = entry.surplus_kwh || 0;
    const isCharge = entry.battery_action === 'charge';
    const stored =
      entry.battery_charged_kwh ??
      (entry.energy_flow_kwh && entry.energy_flow_kwh > 0 ? entry.energy_flow_kwh : 0) ??
      (isCharge ? surplus : 0);
    const exported = entry.grid_export_kwh || 0;
    const wasted = Math.max(0, surplus - stored - exported);

    hourlyAgg[h].surplus.push(surplus);
    hourlyAgg[h].stored.push(stored);
    hourlyAgg[h].exported.push(exported);
    hourlyAgg[h].wasted.push(wasted);
    hourlyAgg[h].deficits.push(entry.deficit_kwh || 0);
    hourlyAgg[h].socs.push(entry.battery_soc_percent || 0);
    hourlyAgg[h].actions.push(entry.battery_action || 'idle');
  });

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  const chartData = Object.keys(hourlyAgg)
    .sort((a, b) => Number(a) - Number(b))
    .map((h) => {
      const agg = hourlyAgg[h];
      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        stored: +avg(agg.stored).toFixed(3),
        exported: +avg(agg.exported).toFixed(3),
        wasted: +avg(agg.wasted).toFixed(3),
        deficit: +avg(agg.deficits).toFixed(3),
        battery_soc: +avg(agg.socs).toFixed(1),
        action: agg.actions.sort(
          (a, b) => agg.actions.filter(x => x === b).length - agg.actions.filter(x => x === a).length
        )[0],
      };
    });

  return (
    <div className="glass-card">
      <h3 className="chart-title">{t('surplus.title')}</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} interval={2} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
            <Bar dataKey="stored" name={t('surplus.stored')} stackId="surplus" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={26} />
            <Bar dataKey="exported" name={t('surplus.exported')} stackId="surplus" fill="#3B82F6" maxBarSize={26} />
            <Bar dataKey="wasted" name={t('surplus.wasted')} stackId="surplus" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar dataKey="deficit" name={t('surplus.deficit')} fill="#EF4444" fillOpacity={0.35} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}