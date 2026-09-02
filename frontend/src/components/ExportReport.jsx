import { Download, Printer } from 'lucide-react';
import { useI18n } from '../i18n';

function buildCsv(hourly, summary) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    'Hour', 'Timestamp', 'Temp (C)', 'Wind (m/s)', 'Cloud (%)', 'GHI (W/m2)',
    'Generation (kWh)', 'Consumption (kWh)', 'Surplus (kWh)', 'Battery Action',
    'Grid Export (kWh)', 'Battery SoC (%)',
  ];
  const rows = hourly.map((h) => [
    h.hour, h.timestamp, h.temperature, h.wind_speed, h.cloud_cover, h.ghi,
    h.predicted_generation_kwh, h.estimated_consumption_kwh, h.surplus_kwh,
    h.battery_action, h.grid_export_kwh, h.battery_soc_percent,
  ].map(esc).join(','));
  const meta = [
    `# Forecast days,${summary?.forecast_days ?? ''}`,
    `# Total generation (kWh),${summary?.total_generation_kwh ?? ''}`,
    `# Total consumption (kWh),${summary?.total_consumption_kwh ?? ''}`,
    `# Total surplus (kWh),${summary?.total_surplus_kwh ?? ''}`,
    `# Grid export (kWh),${summary?.grid_export_kwh ?? ''}`,
  ];
  return [meta.join('\n'), header.join(','), ...rows].join('\n');
}

function downloadCsv(hourly, summary) {
  const csv = buildCsv(hourly, summary);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solar-forecast-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPrintView(hourly, summary) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SolarSurplus Forecast Report</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; padding: 24px; }
  h1 { font-size: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
  th { background: #f1f5f9; }
  td:first-child, th:first-child { text-align: left; }
  .meta { display: flex; gap: 24px; flex-wrap: wrap; margin: 12px 0 20px; font-size: 13px; }
  .meta b { color: #059669; }
</style></head><body>`);
  w.document.write(`<h1>SolarSurplus — 7-Day Forecast Report</h1>`);
  w.document.write(`<div class="meta">
    <span>Generator: <b>${summary?.total_generation_kwh ?? 0} kWh</b></span>
    <span>Consumption: <b>${summary?.total_consumption_kwh ?? 0} kWh</b></span>
    <span>Surplus: <b>${summary?.total_surplus_kwh ?? 0} kWh</b></span>
    <span>Grid Export: <b>${summary?.grid_export_kwh ?? 0} kWh</b></span>
  </div>`);
  w.document.write(`<table><thead><tr>
    <th>Timestamp</th><th>Gen (kWh)</th><th>Cons (kWh)</th><th>Surplus (kWh)</th>
    <th>Battery Action</th><th>Grid Export (kWh)</th><th>SoC (%)</th>
  </tr></thead><tbody>`);
  for (const h of hourly) {
    w.document.write(`<tr>
      <td>${h.timestamp}</td><td>${h.predicted_generation_kwh}</td><td>${h.estimated_consumption_kwh}</td>
      <td>${h.surplus_kwh}</td><td>${h.battery_action}</td><td>${h.grid_export_kwh}</td><td>${h.battery_soc_percent}</td>
    </tr>`);
  }
  w.document.write(`</tbody></table><script>window.print();<\/script></body></html>`);
  w.document.close();
}

export default function ExportReport({ hourly, summary }) {
  const { t } = useI18n();
  if (!hourly || !hourly.length) return null;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn btn-secondary"
        onClick={() => downloadCsv(hourly, summary)}
        style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
      >
        <Download size={13} /> {t('download.csv')}
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => openPrintView(hourly, summary)}
        style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
      >
        <Printer size={13} /> {t('print.report')}
      </button>
    </div>
  );
}