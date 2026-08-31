import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
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
      <p style={{ color: '#10B981', fontSize: 13 }}>
        Surplus: <strong>{entry?.surplus?.toFixed(2)} kWh</strong>
      </p>
      <p style={{ color: '#EF4444', fontSize: 13 }}>
        Deficit: <strong>{entry?.deficit?.toFixed(2)} kWh</strong>
      </p>
      <p style={{ color: '#60A5FA', fontSize: 13 }}>
        Battery: <strong>{entry?.battery_soc?.toFixed(0)}%</strong> ({entry?.action})
      </p>
    </div>
  );
};

export default function SurplusTimeline({ data }) {
  if (!data?.length) return null;

  // Aggregate by hour of day across all forecast days
  const hourlyAgg = {};
  data.forEach((entry) => {
    const h = entry.hour_of_day ?? (entry.hour % 24);
    if (!hourlyAgg[h]) {
      hourlyAgg[h] = { surpluses: [], deficits: [], socs: [], actions: [] };
    }
    hourlyAgg[h].surpluses.push(entry.surplus_kwh || 0);
    hourlyAgg[h].deficits.push(entry.deficit_kwh || 0);
    hourlyAgg[h].socs.push(entry.battery_soc_percent || 0);
    hourlyAgg[h].actions.push(entry.battery_action || 'idle');
  });

  const chartData = Object.keys(hourlyAgg)
    .sort((a, b) => Number(a) - Number(b))
    .map((h) => {
      const agg = hourlyAgg[h];
      const avgSurplus = agg.surpluses.reduce((a, b) => a + b, 0) / agg.surpluses.length;
      const avgDeficit = agg.deficits.reduce((a, b) => a + b, 0) / agg.deficits.length;
      const avgSoc = agg.socs.reduce((a, b) => a + b, 0) / agg.socs.length;
      const primaryAction = agg.actions.sort(
        (a, b) => agg.actions.filter(x => x === b).length - agg.actions.filter(x => x === a).length
      )[0];

      return {
        hour: `${String(h).padStart(2, '0')}:00`,
        net: +(avgSurplus - avgDeficit).toFixed(3),
        surplus: +avgSurplus.toFixed(3),
        deficit: +avgDeficit.toFixed(3),
        battery_soc: +avgSoc.toFixed(1),
        action: primaryAction,
      };
    });

  return (
    <div className="glass-card">
      <h3 className="chart-title">Surplus / Deficit Timeline (Avg by Hour)</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.net >= 0 ? '#10B981' : '#EF4444'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
