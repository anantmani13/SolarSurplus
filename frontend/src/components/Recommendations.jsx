import { Lightbulb } from 'lucide-react';

export default function Recommendations({ recommendations }) {
  if (!recommendations?.length) return null;

  return (
    <div className="glass-card">
      <h3 className="chart-title">
        <Lightbulb size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--amber-400)' }} />
        Smart Recommendations
      </h3>
      {recommendations.map((rec, i) => (
        <div key={i} className="rec-card slide-up" style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
          <p>{rec}</p>
        </div>
      ))}
    </div>
  );
}
