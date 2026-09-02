import { useState, useEffect } from 'react';
import { Calendar, Zap, Sun, Battery, RotateCcw, MapPin } from 'lucide-react';
import { getUserEntries } from '../services/firebase';
import { reverseGeocode, formatCoordinates } from '../services/geo';
import { useI18n } from '../i18n';

export default function UserHistory({ user, onRestore }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoCache, setGeoCache] = useState({});

  useEffect(() => {
    if (!user) return;
    
    async function fetchHistory() {
      try {
        const history = await getUserEntries(user.uid, 10);
        setEntries(history);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistory();
  }, [user]);

  // Reverse-geocode older entries that were saved without a city name
  useEffect(() => {
    if (!entries.length) return;
    let cancelled = false;

    entries.forEach(async (entry) => {
      if (entry.id && geoCache[entry.id]) return;
      if (entry.city) return;
      const lat = entry.latitude;
      const lon = entry.longitude;
      if (lat == null || lon == null) return;
      const geo = await reverseGeocode(lat, lon);
      if (cancelled) return;
      const label = geo?.locality
        ? `${geo.locality}${geo.state ? `, ${geo.state}` : ''}`
        : formatCoordinates(lat, lon);
      setGeoCache((prev) => ({ ...prev, [entry.id]: label }));
    });

    return () => { cancelled = true; };
  }, [entries]);

  const resolveCity = (entry) => {
    if (entry.city) return entry.city;
    if (geoCache[entry.id]) return geoCache[entry.id];
    return formatCoordinates(entry.latitude, entry.longitude) || t('history.unknown');
  };

  if (loading) {
    return (
      <div className="empty-state glass-card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: '#10B981', borderLeftColor: 'transparent', width: 32, height: 32, borderRadius: '50%', borderStyle: 'solid', borderWidth: 3, animation: 'spin 1s linear infinite' }}></div>
        <p>{t('history.loading')}</p>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="empty-state glass-card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="empty-state-icon">📝</div>
        <h3>{t('history.none.title')}</h3>
        <p>{t('history.none.text')}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="fade-in">
      <h2 style={{ marginBottom: 24, fontSize: '1.25rem', fontWeight: 600 }}>{t('history.title')}</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {entries.map((entry) => (
          <div key={entry.id} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.875rem', marginBottom: 4 }}>
                  <Calendar size={14} />
                  {new Date(entry.createdAt?.toDate()).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                  {resolveCity(entry)}
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => onRestore(entry)}
                style={{ padding: '6px 12px', fontSize: '0.875rem' }}
              >
                <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('history.restore')}
              </button>
            </div>
            
            <div className="grid-4" style={{ gap: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  <Sun size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('history.panel')}
                </div>
                <div style={{ fontWeight: 500 }}>{entry.solar_panel_capacity_kw} kW</div>
              </div>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  <Battery size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('history.battery')}
                </div>
                <div style={{ fontWeight: 500 }}>{entry.battery_capacity_kwh} kWh ({entry.current_battery_charge}%)</div>
              </div>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  <Zap size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('history.daily')}
                </div>
                <div style={{ fontWeight: 500 }}>{entry.avg_daily_consumption_kwh} kWh</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  <MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> {t('history.location')}
                </div>
                <div style={{ fontWeight: 500 }}>{resolveCity(entry)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
