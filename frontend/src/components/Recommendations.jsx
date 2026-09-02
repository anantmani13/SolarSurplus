import { Lightbulb, Sun, Battery, Zap, Check, TrendingUp, Badge } from 'lucide-react';
import { useI18n } from '../i18n';

const ICON_MAP = {
  Sun: <Sun size={18} />,
  Battery: <Battery size={18} />,
  Zap: <Zap size={18} />,
  Check: <Check size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  Badge: <Badge size={18} />,
};

const CATEGORY_COLORS = {
  'Energy Optimization': 'var(--emerald-400)',
  'Surplus Usage': 'var(--blue-400)',
  'Government Schemes': 'var(--amber-400)',
};

const CATEGORY_LABELS = (t) => ({
  'Energy Optimization': t('recs.cat.energy'),
  'Surplus Usage': t('recs.cat.surplus'),
  'Government Schemes': t('recs.cat.gov'),
});

function normalizeRec(rec, idx) {
  if (typeof rec === 'string') {
    const category = rec.includes('net metering') || rec.includes('export')
      ? 'Surplus Usage'
      : 'Energy Optimization';
    return { id: idx, category, icon: 'Sun', title: null, message: rec };
  }
  return {
    id: idx,
    category: rec.category || 'Energy Optimization',
    icon: ICON_MAP[rec.icon] ? rec.icon : 'Sun',
    title: rec.title || null,
    message: rec.message,
  };
}

export default function Recommendations({ recommendations }) {
  const { t } = useI18n();
  if (!recommendations?.length) return null;

  const grouped = recommendations.reduce((acc, rec, idx) => {
    const r = normalizeRec(rec, idx);
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="glass-card">
      <h3 className="chart-title">
        <Lightbulb size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--amber-400)' }} />
        {t('recs.title')}
      </h3>

      {Object.entries(grouped).map(([category, recs], groupIdx) => (
        <div key={category} style={{ marginBottom: groupIdx < Object.keys(grouped).length - 1 ? 14 : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: CATEGORY_COLORS[category] || 'var(--text-muted)', marginBottom: 8 }}>
            {CATEGORY_LABELS(t)[category] || category}
          </div>
          {recs.map((rec, i) => (
            <div
              key={rec.id}
              className="rec-card slide-up"
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
            >
              <div
                className="stat-card-icon"
                style={{
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)',
                  color: CATEGORY_COLORS[category] || 'var(--text-muted)',
                }}
              >
                {ICON_MAP[rec.icon] || ICON_MAP.Sun}
              </div>
              <div>
                {rec.title && (
                  <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>
                    {rec.title}
                  </strong>
                )}
                <p style={{ margin: 0 }}>{rec.message}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}