import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: 'rgba(17, 24, 39, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '14px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: '#f1f5f9' }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: 13, marginBottom: 4 }}>
          {entry.name}: <strong>{entry.value?.toFixed(2)} kWh</strong>
        </p>
      ))}
    </div>
  );
};

export default function ForecastChart({ data, title = 'Solar Generation Forecast' }) {
  if (!data?.length) return null;

  // Show first 48 hours (2 days) for readability
  const chartData = data.slice(0, 48).map((entry, i) => ({
    time: entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : `H${i}`,
    Generation: entry.predicted_generation_kwh || entry.generation_kwh || 0,
    Consumption: entry.estimated_consumption_kwh || entry.consumption_kwh || 0,
    Surplus: Math.max(0, (entry.surplus_kwh || 0)),
  }));

  return (
    <div className="glass-card">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSurplus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="Generation"
              stroke="#10B981"
              fill="url(#gradGen)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#10B981' }}
            />
            <Area
              type="monotone"
              dataKey="Consumption"
              stroke="#F59E0B"
              fill="url(#gradCon)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#F59E0B' }}
            />
            <Area
              type="monotone"
              dataKey="Surplus"
              stroke="#3B82F6"
              fill="url(#gradSurplus)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#3B82F6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
