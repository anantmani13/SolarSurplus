import { useState } from 'react';
import {
  Sun, Battery, MapPin, Calendar, Gauge,
  Zap, ArrowRight, Loader2
} from 'lucide-react';

const DEFAULT_VALUES = {
  solar_panel_capacity_kw: 5,
  battery_capacity_kwh: 10,
  current_battery_charge: 50,
  panel_age_years: 2,
  battery_age_years: 1,
  latitude: 12.97,   // Hassan, Karnataka (matches dataset location)
  longitude: 75.56,
  avg_daily_consumption_kwh: 15,
};

export default function InputForm({ onSubmit, loading }) {
  const [form, setForm] = useState(DEFAULT_VALUES);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
          }));
        },
        (err) => console.error('Geolocation error:', err)
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
            Enter your solar panel and battery details
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

        {/* Location */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label className="form-label" style={{ margin: 0 }}>
              <MapPin size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Location
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGeolocate}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              <MapPin size={14} />
              Use My Location
            </button>
          </div>
          <div className="grid-2">
            <div className="form-group">
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
            <div className="form-group">
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
          style={{ width: '100%', marginTop: 8 }}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="spinner" />
              Generating Forecast...
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
