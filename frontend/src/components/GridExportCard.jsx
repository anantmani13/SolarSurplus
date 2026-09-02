import { useState, useEffect } from 'react';
import { Zap, MapPin, Calendar, TrendingUp, ExternalLink, Info } from 'lucide-react';
import {
  getTariffForCoordinates,
  SCHEME_URL,
  PM_SURYAGHAR_URL,
} from '../data/tariffData';
import { formatCoordinates } from '../services/geo';
import { useI18n, f } from '../i18n';

const inr = (value) =>
  `₹${Math.round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function GridExportCard({
  summary,
  latitude = 25.49,
  longitude = 81.86,
}) {
  const { t } = useI18n();
  const [tariffInfo, setTariffInfo] = useState({ state: null, tariff: null });
  const [loadingTariff, setLoadingTariff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTariff(true);
    getTariffForCoordinates(latitude, longitude).then((res) => {
      if (!cancelled) {
        setTariffInfo(res);
        setLoadingTariff(false);
      }
    });
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  if (!summary) return null;

  const totalSurplus = summary.total_surplus_kwh || 0;
  const usableCapacity = summary.usable_battery_capacity_kwh || 0;

  // Prefer exported figure from the forecast engine; otherwise estimate what
  // couldn't fit in the battery over the forecast period.
  const exportKwh7 =
    Number(summary.grid_export_kwh) ||
    Math.max(0, totalSurplus - usableCapacity);
  const exportDaily = exportKwh7 / (summary.forecast_days || 7);
  const rate = tariffInfo.tariff?.rate ?? 3.0;
  const stateName = tariffInfo.state || tariffInfo.tariff?.detected;

  const monthlyExport = exportDaily * 30;
  const yearlyExport = exportDaily * 365;
  const monthlyEarnings = monthlyExport * rate;
  const yearlyEarnings = yearlyExport * rate;

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="stat-card-icon blue">
          <Zap size={20} />
        </div>
        <div>
          <h3 className="chart-title" style={{ margin: 0 }}>
            {t('grid.title')}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('grid.subtitle')}
          </p>
        </div>
        {stateName && (
          <span
            className="badge badge-blue"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <MapPin size={12} /> {stateName}
          </span>
        )}
      </div>

      <div className="grid-2" style={{ gap: 14 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('grid.surplus')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {exportDaily.toFixed(1)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>kWh/day</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {f(t('grid.period'), { v: exportKwh7.toFixed(1) })}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <IndianRupeeSymbol /> {t('grid.tariff')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            ₹{rate.toFixed(2)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/kWh</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {loadingTariff ? t('grid.detect') : stateName ? f(t('grid.credit'), { s: stateName }) : formatCoordinates(latitude, longitude) || t('grid.default')}
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('grid.monthly')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-400)' }}>
            {inr(monthlyEarnings)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            ≈ {f(t('grid.expKwh'), { v: monthlyExport.toFixed(0) })}
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('grid.yearly')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-400)' }}>
            {inr(yearlyEarnings)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            ≈ {f(t('grid.expKwh'), { v: yearlyExport.toFixed(0) })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <Info size={13} style={{ display: 'inline', marginRight: 6, color: 'var(--blue-400)', verticalAlign: 'middle' }} />
        {t('grid.info')}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <a
          className="btn btn-secondary"
          href={SCHEME_URL}
          target="_blank"
          rel="noreferrer"
          style={{ padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
        >
          {t('grid.tariffbtn')} <ExternalLink size={13} />
        </a>
        <a
          className="btn btn-secondary"
          href={PM_SURYAGHAR_URL}
          target="_blank"
          rel="noreferrer"
          style={{ padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
        >
          {t('grid.apply')} <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

function IndianRupeeSymbol() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4 }}>
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 8.5 8" />
      <path d="M6 13h3" />
      <path d="M9 13c6.667 0 6.667-10 0-10" />
    </svg>
  );
}