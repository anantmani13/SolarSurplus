import { Sun, Droplets, Wind, Cloud, ThermometerSun, Radio, Zap, Eye } from 'lucide-react';
import { useI18n } from '../i18n';

export default function WeatherPanel({ weatherData, dataSource }) {
  const { t } = useI18n();
  if (!weatherData?.length) return null;

  // Show current (first) entry and next few hours
  const current = weatherData[0];
  const upcoming = weatherData.slice(1, 7);

  const isEstimated = dataSource === 'estimated';
  const sourceLabel = isEstimated ? t('weather.estimated') : (dataSource || t('weather.live'));

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sun size={18} color="var(--amber-400)" />
          <h3 className="chart-title" style={{ margin: 0 }}>{t('weather.title')}</h3>
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 20,
          background: isEstimated ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          color: isEstimated ? 'var(--amber-400)' : 'var(--emerald-400)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <Radio size={10} />
          {sourceLabel}
        </span>
      </div>

      {/* Main weather header card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 2fr',
        gap: 16,
        marginBottom: 16,
        padding: '16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        {/* Temperatures */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ThermometerSun size={38} color="var(--amber-400)" />
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {current.temperature?.toFixed(1)}°C
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
              {t('weather.ambient')}
            </div>
            {current.cell_temperature && (
              <div style={{ fontSize: 12, color: 'var(--amber-400)', marginTop: 3 }}>
                {t('weather.pvcell')}: <strong>{current.cell_temperature.toFixed(1)}°C</strong>
              </div>
            )}
          </div>
        </div>

        {/* Multi-metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <WeatherMetric
            icon={<Sun size={15} />}
            label={t('weather.ghi')}
            value={`${current.ghi?.toFixed(0)} W/m²`}
            color="var(--amber-400)"
          />
          <WeatherMetric
            icon={<Wind size={15} />}
            label={t('weather.wind')}
            value={`${current.wind_speed?.toFixed(1)} m/s`}
            color="var(--text-secondary)"
          />
          <WeatherMetric
            icon={<Cloud size={15} />}
            label={t('weather.cloud')}
            value={`${current.cloud_cover?.toFixed(0)}%`}
            color="var(--blue-400)"
          />
          <WeatherMetric
            icon={<Zap size={15} />}
            label={t('weather.dni')}
            value={`${current.dni ? current.dni.toFixed(0) : (current.ghi * 0.85).toFixed(0)} W/m²`}
            color="var(--amber-300)"
          />
          <WeatherMetric
            icon={<Droplets size={15} />}
            label={t('weather.humidity')}
            value={`${current.humidity ? current.humidity.toFixed(0) : 60}%`}
            color="var(--blue-300)"
          />
          <WeatherMetric
            icon={<Eye size={15} />}
            label={t('weather.dhi')}
            value={`${current.dhi ? current.dhi.toFixed(0) : (current.ghi * 0.15).toFixed(0)} W/m²`}
            color="var(--emerald-400)"
          />
        </div>
      </div>

      {/* Upcoming hours timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {upcoming.map((hour, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '10px 6px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              {hour.timestamp
                ? new Date(hour.timestamp).toLocaleTimeString('en-US', { hour: '2-digit' })
                : `+${i + 1}h`}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
              {hour.temperature?.toFixed(0)}°C
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber-400)', marginBottom: 2 }}>
              {hour.ghi?.toFixed(0)} W/m²
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
              💨 {hour.wind_speed?.toFixed(1)}m/s
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeatherMetric({ icon, label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(255,255,255,0.02)', borderRadius: 6 }}>
      <div style={{ color, marginBottom: 2, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
