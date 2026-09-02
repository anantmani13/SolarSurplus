import { Download, Printer } from 'lucide-react';
import { useI18n } from '../i18n';

const ACTION_LABEL = (t) => ({
  charge: t('battery.charging'),
  discharge: t('battery.discharging'),
  idle: t('battery.idle'),
});

function buildCsv(hourly, summary, t) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const al = ACTION_LABEL(t);
  const header = [
    t('rep.hour'), t('rep.timestamp'), t('rep.temp'), t('rep.wind'), t('rep.cloud'), t('rep.ghi'),
    t('rep.gen'), t('rep.cons'), t('rep.surplus'), t('rep.action'),
    t('rep.gexport'), t('rep.soc'),
  ];
  const rows = hourly.map((h) => [
    h.hour, h.timestamp, h.temperature, h.wind_speed, h.cloud_cover, h.ghi,
    h.predicted_generation_kwh, h.estimated_consumption_kwh, h.surplus_kwh,
    al[h.battery_action] || h.battery_action, h.grid_export_kwh, h.battery_soc_percent,
  ].map(esc).join(','));
  const meta = [
    `# ${t('rep.days')},${summary?.forecast_days ?? ''}`,
    `# ${t('rep.totgen')},${summary?.total_generation_kwh ?? ''}`,
    `# ${t('rep.totcons')},${summary?.total_consumption_kwh ?? ''}`,
    `# ${t('rep.totsurplus')},${summary?.total_surplus_kwh ?? ''}`,
    `# ${t('rep.totgexp')},${summary?.grid_export_kwh ?? ''}`,
  ];
  return [meta.join('\n'), header.join(','), ...rows].join('\n');
}

function downloadCsv(hourly, summary, t) {
  const csv = buildCsv(hourly, summary, t);
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

function openPrintView(hourly, summary, t) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${t('rep.ptitle')}</title>
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
  w.document.write(`<h1>${t('rep.htmltitle')}</h1>`);
  w.document.write(`<div class="meta">
    <span>${t('rep.generator')}: <b>${summary?.total_generation_kwh ?? 0} kWh</b></span>
    <span>${t('rep.consumption')}: <b>${summary?.total_consumption_kwh ?? 0} kWh</b></span>
    <span>${t('rep.surplus')}: <b>${summary?.total_surplus_kwh ?? 0} kWh</b></span>
    <span>${t('rep.gridexport')}: <b>${summary?.grid_export_kwh ?? 0} kWh</b></span>
  </div>`);
  w.document.write(`<table><thead><tr>
    <th>${t('rep.timestamp')}</th><th>${t('rep.gen')}</th><th>${t('rep.cons')}</th><th>${t('rep.surplus')}</th>
    <th>${t('rep.action')}</th><th>${t('rep.gexport')}</th><th>${t('rep.soc')}</th>
  </tr></thead><tbody>`);
  const al = ACTION_LABEL(t);
  for (const h of hourly) {
    w.document.write(`<tr>
      <td>${h.timestamp}</td><td>${h.predicted_generation_kwh}</td><td>${h.estimated_consumption_kwh}</td>
      <td>${h.surplus_kwh}</td><td>${al[h.battery_action] || h.battery_action}</td><td>${h.grid_export_kwh}</td><td>${h.battery_soc_percent}</td>
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
        onClick={() => downloadCsv(hourly, summary, t)}
        style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
      >
        <Download size={13} /> {t('download.csv')}
      </button>
      <button
        className="btn btn-secondary"
        onClick={() => openPrintView(hourly, summary, t)}
        style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
      >
        <Printer size={13} /> {t('print.report')}
      </button>
    </div>
  );
}