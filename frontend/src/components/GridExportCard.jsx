import { useState, useEffect } from 'react';
import { Zap, MapPin, Calendar, TrendingUp, ExternalLink, Info } from 'lucide-react';
import {
  getTariffForCoordinates,
  SCHEME_URL,
  PM_SURYAGHAR_URL,
} from '../data/tariffData';
import { formatCoordinates } from '../services/geo';

const inr = (value) =>
  `₹${Math.round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function GridExportCard({
  summary,
  latitude = 25.49,
  longitude = 81.86,
}) {
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
            Grid Export & Net Metering
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            PM Surya Ghar · Earn from surplus solar energy
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
            <Calendar size={12} style={{ display: 'inline', marginRight: 4 }} /> Exportable Surplus
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {exportDaily.toFixed(1)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>kWh/day</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {exportKwh7.toFixed(1)} kWh over forecast period
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <IndianRupeeSymbol /> Export Tariff
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            ₹{rate.toFixed(2)} <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/kWh</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {loadingTariff ? 'Detecting state…' : stateName ? `Net-metering credit · ${stateName}` : formatCoordinates(latitude, longitude) || 'Default national average'}
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> Monthly Earnings
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-400)' }}>
            {inr(monthlyEarnings)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            ≈ {monthlyExport.toFixed(0)} kWh exported to grid
          </div>
        </div>

        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> Yearly Earnings
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-400)' }}>
            {inr(yearlyEarnings)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            ≈ {yearlyExport.toFixed(0)} kWh exported to grid
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <Info size={13} style={{ display: 'inline', marginRight: 6, color: 'var(--blue-400)', verticalAlign: 'middle' }} />
        Under the <strong>PM Surya Ghar: Muft Bijli Yojana</strong>, surplus solar energy exported to the grid is credited at your state's net-metering rate — turning excess generation into direct savings on your electricity bill.
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <a
          className="btn btn-secondary"
          href={SCHEME_URL}
          target="_blank"
          rel="noreferrer"
          style={{ padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
        >
          State Tariff Details <ExternalLink size={13} />
        </a>
        <a
          className="btn btn-secondary"
          href={PM_SURYAGHAR_URL}
          target="_blank"
          rel="noreferrer"
          style={{ padding: '8px 14px', fontSize: 12.5, textDecoration: 'none' }}
        >
          Apply on PM Surya Ghar <ExternalLink size={13} />
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