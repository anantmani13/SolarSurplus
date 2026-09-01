import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Zap, Sun, Wind } from 'lucide-react';

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
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value} {entry.unit || ''}</strong>
        </p>
      ))}
    </div>
  );
};

export default function ForecastChart({ data, title = 'Solar Forecast & Irradiance' }) {
  const [viewMode, setViewMode] = useState('power'); // 'power' | 'weather'

  if (!data?.length) return null;

  // First 48 hours for clarity
  const chartData = data.slice(0, 48).map((entry, i) => ({
    time: entry.timestamp
      ? new Date(entry.timestamp).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
      : `H${i}`,
    Generation: entry.predicted_generation_kwh || entry.generation_kwh || 0,
    Consumption: entry.estimated_consumption_kwh || entry.consumption_kwh || 0,
    Surplus: Math.max(0, (entry.surplus_kwh || 0)),
    GHI: entry.ghi || 0,
    DNI: entry.dni || Math.round((entry.ghi || 0) * 0.85),
    Temp: entry.temperature || 0,
    CellTemp: entry.cell_temperature || entry.temperature || 0,
    Wind: entry.wind_speed || 0,
  }));

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 className="chart-title" style={{ margin: 0 }}>{title}</h3>

        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('power')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: viewMode === 'power' ? 'var(--emerald-500)' : 'transparent',
              color: viewMode === 'power' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <Zap size={13} /> Power (kWh)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('weather')}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: viewMode === 'weather' ? 'var(--amber-500)' : 'transparent',
              color: viewMode === 'weather' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <Sun size={13} /> Irradiance & Weather
          </button>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'power' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSurplus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" kWh" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              <Area type="monotone" dataKey="Generation" stroke="#10B981" fill="url(#gradGen)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#10B981' }} unit=" kWh" />
              <Area type="monotone" dataKey="Surplus" stroke="#3B82F6" fill="url(#gradSurplus)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#3B82F6' }} unit=" kWh" />
              <Line type="monotone" dataKey="Consumption" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#F59E0B' }} unit=" kWh" />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGHI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis yAxisId="left" stroke="#F59E0B" tick={{ fontSize: 11 }} unit=" W/m²" />
              <YAxis yAxisId="right" orientation="right" stroke="#38BDF8" tick={{ fontSize: 11 }} unit=" °C/ms" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              <Area yAxisId="left" type="monotone" dataKey="GHI" name="GHI Solar Irradiance" stroke="#F59E0B" fill="url(#gradGHI)" strokeWidth={2} dot={false} unit=" W/m²" />
              <Line yAxisId="left" type="monotone" dataKey="DNI" name="DNI Direct Irradiance" stroke="#FB7185" strokeWidth={1.5} strokeDasharray="4 4" dot={false} unit=" W/m²" />
              <Line yAxisId="right" type="monotone" dataKey="CellTemp" name="PV Cell Temp" stroke="#EF4444" strokeWidth={2} dot={false} unit=" °C" />
              <Line yAxisId="right" type="monotone" dataKey="Temp" name="Air Temp" stroke="#38BDF8" strokeWidth={1.5} dot={false} unit=" °C" />
              <Line yAxisId="right" type="monotone" dataKey="Wind" name="Wind Speed" stroke="#A7F3D0" strokeWidth={1.5} strokeDasharray="3 3" dot={false} unit=" m/s" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
