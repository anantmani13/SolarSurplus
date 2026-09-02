import { useState } from 'react';
import {
  ComposedChart, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { Zap, Sun, Wind, TrendingUp } from 'lucide-react';
import { useI18n } from '../i18n';

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

export default function ForecastChart({ data, title }) {
  const { t } = useI18n();
  const [viewMode, setViewMode] = useState('power'); // 'power' | 'weather' | 'export'

  if (!data?.length) return null;

  // First 48 hours for clarity
  const chartData = data.slice(0, 48).map((entry, i) => ({
    time: entry.timestamp
      ? new Date(entry.timestamp).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
      : `H${i}`,
    Generation: entry.predicted_generation_kwh || entry.generation_kwh || 0,
    Consumption: entry.estimated_consumption_kwh || entry.consumption_kwh || 0,
    Surplus: Math.max(0, (entry.surplus_kwh || 0)),
    NetExport: entry.grid_export_kwh || 0,
    BatterySoC: entry.battery_soc_percent || 0,
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
            <Zap size={13} /> {t('chart.power')}
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
            <Sun size={13} /> {t('chart.weather')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('export')}
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
              background: viewMode === 'export' ? 'var(--blue-500)' : 'transparent',
              color: viewMode === 'export' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <TrendingUp size={13} /> {t('chart.export')}
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
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval={6} angle={-28} height={56} textAnchor="end" />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" kWh" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              <Area type="monotone" dataKey="Generation" name={t('series.gen')} stroke="#10B981" fill="url(#gradGen)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#10B981' }} unit=" kWh" />
              <Area type="monotone" dataKey="Surplus" name={t('series.surplus')} stroke="#3B82F6" fill="url(#gradSurplus)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#3B82F6' }} unit=" kWh" />
              <Line type="monotone" dataKey="Consumption" name={t('series.cons')} stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#F59E0B' }} unit=" kWh" />
            </ComposedChart>
          ) : viewMode === 'weather' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradGHI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval={6} angle={-28} height={56} textAnchor="end" />
              <YAxis yAxisId="left" stroke="#F59E0B" tick={{ fontSize: 11 }} unit=" W/m²" />
              <YAxis yAxisId="right" orientation="right" stroke="#38BDF8" tick={{ fontSize: 11 }} unit=" °C/ms" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              <Area yAxisId="left" type="monotone" dataKey="GHI" name={t('series.ghi')} stroke="#F59E0B" fill="url(#gradGHI)" strokeWidth={2} dot={false} unit=" W/m²" />
              <Line yAxisId="left" type="monotone" dataKey="DNI" name={t('series.dni')} stroke="#FB7185" strokeWidth={1.5} strokeDasharray="4 4" dot={false} unit=" W/m²" />
              <Line yAxisId="right" type="monotone" dataKey="CellTemp" name={t('series.celltemp')} stroke="#EF4444" strokeWidth={2} dot={false} unit=" °C" />
              <Line yAxisId="right" type="monotone" dataKey="Temp" name={t('series.airtemp')} stroke="#38BDF8" strokeWidth={1.5} dot={false} unit=" °C" />
              <Line yAxisId="right" type="monotone" dataKey="Wind" name={t('series.wind')} stroke="#A7F3D0" strokeWidth={1.5} strokeDasharray="3 3" dot={false} unit=" m/s" />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradExport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} interval={6} angle={-28} height={56} textAnchor="end" />
              <YAxis yAxisId="left" stroke="#60A5FA" tick={{ fontSize: 11 }} unit=" kWh" label={{ value: t('axis.gridexport.short'), angle: -90, position: 'insideLeft', style: { fill: '#60A5FA', fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" stroke="#A78BFA" tick={{ fontSize: 11 }} domain={[0, 100]} unit=" %" label={{ value: t('axis.soc'), angle: 90, position: 'insideRight', style: { fill: '#A78BFA', fontSize: 11 } }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
              <ReferenceLine yAxisId="right" y={100} stroke="#A78BFA" strokeDasharray="6 4" strokeOpacity={0.6} label={{ value: t('series.battfull'), position: 'insideTopRight', fill: '#A78BFA', fontSize: 11 }} />
              <Area yAxisId="left" type="monotone" dataKey="NetExport" name={t('series.exported')} stroke="#3B82F6" fill="url(#gradExport)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#3B82F6' }} unit=" kWh" />
              <Area yAxisId="left" type="monotone" dataKey="Surplus" name={t('series.totalsurplus')} stroke="#34D399" strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={0.7} fill="none" dot={false} unit=" kWh" />
              <Line yAxisId="right" type="monotone" dataKey="BatterySoC" name={t('series.soc')} stroke="#A78BFA" strokeWidth={2} dot={false} unit=" %" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
