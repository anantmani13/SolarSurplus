import { useState, useEffect } from 'react';
import { Wallet, Settings2, PiggyBank, TrendingUp, Clock, Info } from 'lucide-react';
import { getTariffForCoordinates } from '../data/tariffData';
import { useI18n } from '../i18n';

const RETAIL_RATE = 7.5; // ₹/kWh approx. national retail
const INSTALL_COST_PER_KW = 70000; // ₹/kW typical rooftop price

const inr = (value) =>
  `₹${Math.round(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function SavingsCard({ summary, input }) {
  const { t } = useI18n();
  const [tariffInfo, setTariffInfo] = useState({ state: null, tariff: null });

  useEffect(() => {
    let cancelled = false;
    if (!input?.latitude || !input?.longitude) return;
    getTariffForCoordinates(input.latitude, input.longitude).then((res) => {
      if (!cancelled) setTariffInfo(res);
    });
    return () => { cancelled = true; };
  }, [input?.latitude, input?.longitude]);

  if (!summary) return null;

  const days = summary.forecast_days || 7;
  const genDay = (summary.total_generation_kwh || 0) / days;
  const conDay = (summary.total_consumption_kwh || 0) / days;
  const exportDay =
    Number(summary.grid_export_kwh) / days ||
    Math.max(0, (summary.total_surplus_kwh || 0) - (summary.usable_battery_capacity_kwh || 0)) / days;
  const exportRate = tariffInfo.tariff?.rate ?? 3.0;

  const genSavingsDay = genDay * RETAIL_RATE;
  const exportEarningsDay = exportDay * exportRate;
  const totalDay = genSavingsDay + exportEarningsDay;
  const monthly = totalDay * 30;
  const yearly = totalDay * 365;

  const capacity = input?.solar_panel_capacity_kw || summary.panel_capacity_kw || 5;
  const capex = capacity * INSTALL_COST_PER_KW;
  const paybackYears = yearly > 0 ? capex / yearly : 0;

  const billDay = conDay * RETAIL_RATE;
  const billWithSolar = Math.max(0, billDay - genSavingsDay);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div className="stat-card-icon emerald">
          <Wallet size={20} />
        </div>
        <div>
          <h3 className="chart-title" style={{ margin: 0 }}>
            {t('savings.title')}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {capacity} kW · {capacity * INSTALL_COST_PER_KW >= 0 ? `Capex ≈ ${inr(capex)}` : ''}
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 14 }}>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--emerald-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('savings.monthly')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald-400)' }}>
            {inr(monthly)}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}> /mo</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            ≈ {inr(yearly)} / year
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <Zap2 /> {t('savings.onbill')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            {inr(genSavingsDay * 30)}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}> /mo</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {billDay.toFixed(0)} kWh/day consumed → {billWithSolar.toFixed(0)} kWh equivalent
          </div>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--blue-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('savings.netexport')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue-400)' }}>
            {inr(exportEarningsDay * 30)}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}> /mo</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {exportDay.toFixed(1)} kWh/day @ ₹{exportRate.toFixed(2)} ({tariffInfo.state || 'default'})
          </div>
        </div>

        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.25)', padding: 14, borderRadius: 10 }}>
          <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('savings.payback')}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>
            {paybackYears > 0 ? paybackYears.toFixed(1) : '—'}
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}> yrs</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {inr(capex)} installed · {inr(yearly)}/yr saved
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <Info size={13} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>{t('savings.est')}</span>
      </div>
    </div>
  );
}

function Zap2() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: 4 }}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}