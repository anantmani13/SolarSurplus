import { Sun, Droplets, Wind, Cloud, ThermometerSun } from 'lucide-react';

export default function WeatherPanel({ weatherData }) {
  if (!weatherData?.length) return null;

  // Show current (first) entry and next few hours
  const current = weatherData[0];
  const upcoming = weatherData.slice(1, 7);

  return (
    <div className="glass-card">
      <h3 className="chart-title">Weather Conditions</h3>

      {/* Current weather */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        marginBottom: 24,
        padding: '16px 20px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div>
          <ThermometerSun size={40} color="var(--amber-400)" />
        </div>
        <div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {current.temperature?.toFixed(1)}°C
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Current Temperature
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
          <WeatherMetric
            icon={<Sun size={16} />}
            label="GHI"
            value={`${current.ghi?.toFixed(0)} W/m²`}
            color="var(--amber-400)"
          />
          <WeatherMetric
            icon={<Cloud size={16} />}
            label="Cloud"
            value={`${current.cloud_cover?.toFixed(0)}%`}
            color="var(--blue-400)"
          />
          <WeatherMetric
            icon={<Wind size={16} />}
            label="Wind"
            value={`${current.wind_speed?.toFixed(1)} km/h`}
            color="var(--text-secondary)"
          />
        </div>
      </div>

      {/* Upcoming hours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {upcoming.map((hour, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '12px 8px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {hour.timestamp
                ? new Date(hour.timestamp).toLocaleTimeString('en-US', { hour: '2-digit' })
                : `+${i + 1}h`}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              {hour.temperature?.toFixed(0)}°
            </div>
            <div style={{ fontSize: 11, color: 'var(--emerald-400)' }}>
              {hour.ghi?.toFixed(0)} W/m²
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ☁ {hour.cloud_cover?.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherMetric({ icon, label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
