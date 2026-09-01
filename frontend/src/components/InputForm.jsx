import { useState, useEffect } from 'react';
import {
  Sun, Battery, MapPin, Calendar, Gauge,
  Zap, ArrowRight, Loader2, Search, Check
} from 'lucide-react';

const DEFAULT_VALUES = {
  solar_panel_capacity_kw: 5,
  battery_capacity_kwh: 10,
  current_battery_charge: 50,
  panel_age_years: 2,
  battery_age_years: 1,
  latitude: 25.4934,  // Prayagraj (sensible default)
  longitude: 81.8675,
  avg_daily_consumption_kwh: 15,
};

export default function InputForm({ onSubmit, loading }) {
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [geoStatus, setGeoStatus] = useState('idle'); // 'detecting' | 'success' | 'failed' | 'idle'
  const [cityName, setCityName] = useState('Prayagraj, UP');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGeoStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));
          setGeoStatus('success');

          // Reverse geocode to get city name
          try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lon}&count=1&language=en&format=json`);
            const data = await res.json();
            if (data?.results?.[0]?.name) {
              setCityName(`${data.results[0].name}, ${data.results[0].country || ''}`);
            } else {
              setCityName(`${lat}°N, ${lon}°E`);
            }
          } catch {
            setCityName(`${lat}°N, ${lon}°E`);
          }
        },
        () => {
          setGeoStatus('failed');
          setCityName('Prayagraj, UP (Default)');
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Search cities via Open-Meteo free geocoding API
  const handleSearchCity = async (query) => {
    setCitySearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = (city) => {
    const lat = parseFloat(city.latitude.toFixed(4));
    const lon = parseFloat(city.longitude.toFixed(4));
    const label = `${city.name}${city.admin1 ? ', ' + city.admin1 : ''} (${city.country_code || city.country})`;
    
    setForm((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lon,
    }));
    setCityName(label);
    setCitySearchQuery('');
    setShowDropdown(false);
    setGeoStatus('success');
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      setGeoStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lon = parseFloat(pos.coords.longitude.toFixed(4));
          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));
          setGeoStatus('success');
          setCityName(`GPS: ${lat}°N, ${lon}°E`);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setGeoStatus('failed');
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="glass-card slide-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div className="stat-card-icon emerald">
          <Sun size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>System Configuration</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Enter your solar panel, battery, and location details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          {/* Solar Panel Capacity */}
          <div className="form-group">
            <label className="form-label">
              <Sun size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Solar Panel Capacity (kW)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.solar_panel_capacity_kw}
              onChange={(e) => handleChange('solar_panel_capacity_kw', e.target.value)}
              min="0.1"
              step="0.1"
              required
            />
            <span className="form-helper">Total rated power of your solar panels</span>
          </div>

          {/* Battery Capacity */}
          <div className="form-group">
            <label className="form-label">
              <Battery size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Battery Capacity (kWh)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.battery_capacity_kwh}
              onChange={(e) => handleChange('battery_capacity_kwh', e.target.value)}
              min="0.1"
              step="0.1"
              required
            />
            <span className="form-helper">Total energy storage capacity</span>
          </div>

          {/* Current Charge */}
          <div className="form-group">
            <label className="form-label">
              <Gauge size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Current Battery Charge (%)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.current_battery_charge}
              onChange={(e) => handleChange('current_battery_charge', e.target.value)}
              min="0"
              max="100"
              required
            />
            <span className="form-helper">State of charge right now</span>
          </div>

          {/* Daily Consumption */}
          <div className="form-group">
            <label className="form-label">
              <Zap size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Avg. Daily Consumption (kWh)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.avg_daily_consumption_kwh}
              onChange={(e) => handleChange('avg_daily_consumption_kwh', e.target.value)}
              min="0.1"
              step="0.1"
              required
            />
            <span className="form-helper">Your average daily electricity usage</span>
          </div>

          {/* Panel Age */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Panel Age (years)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.panel_age_years}
              onChange={(e) => handleChange('panel_age_years', e.target.value)}
              min="0"
              step="0.5"
            />
            <span className="form-helper">Panels degrade ~0.5%/year</span>
          </div>

          {/* Battery Age */}
          <div className="form-group">
            <label className="form-label">
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Battery Age (years)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.battery_age_years}
              onChange={(e) => handleChange('battery_age_years', e.target.value)}
              min="0"
              step="0.5"
            />
            <span className="form-helper">Batteries degrade ~2%/year</span>
          </div>
        </div>

        {/* Location Section */}
        <div style={{ marginTop: 12, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} color="var(--emerald-400)" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Location / City</span>
              {cityName && (
                <span style={{ fontSize: 12, color: 'var(--emerald-400)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 12 }}>
                  📍 {cityName}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGeolocate}
              style={{ padding: '6px 12px', fontSize: 12, gap: 4 }}
            >
              {geoStatus === 'detecting' ? (
                <>
                  <Loader2 size={12} className="spin" /> Locating...
                </>
              ) : (
                <>
                  <MapPin size={12} /> Use GPS
                </>
              )}
            </button>
          </div>

          {/* City Search Bar with Autocomplete */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0 12px' }}>
              <Search size={14} color="var(--text-muted)" style={{ marginRight: 8 }} />
              <input
                type="text"
                placeholder="Search city or town (e.g. Prayagraj, Delhi, Mumbai, Bengaluru, London...)"
                value={citySearchQuery}
                onChange={(e) => handleSearchCity(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              {isSearching && <Loader2 size={14} className="spin" color="var(--emerald-400)" />}
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#1a1f2e',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                zIndex: 50,
                maxHeight: 200,
                overflowY: 'auto',
              }}>
                {searchResults.map((city, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectCity(city)}
                    style={{
                      padding: '10px 14px',
                      fontSize: 13,
                      cursor: 'pointer',
                      borderBottom: idx < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong>{city.name}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>
                        {city.admin1 ? `${city.admin1}, ` : ''}{city.country || ''}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latitude and Longitude Inputs */}
          <div className="grid-2">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Latitude (°N)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Latitude"
                value={form.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                min="-90"
                max="90"
                step="0.0001"
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Longitude (°E)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Longitude"
                value={form.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                min="-180"
                max="180"
                step="0.0001"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={loading}
          style={{ width: '100%', marginTop: 16 }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="spinner" />
              Generating Accurate Forecast...
            </>
          ) : (
            <>
              Generate 7-Day Forecast
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
