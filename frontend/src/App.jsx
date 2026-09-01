import { useState, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { generateForecast } from './services/api';
import { saveUserEntry, savePrediction, saveNotification } from './services/firebase';

import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import InputForm from './components/InputForm';
import StatCards from './components/StatCards';
import ForecastChart from './components/ForecastChart';
import SurplusTimeline from './components/SurplusTimeline';
import BatteryStatus from './components/BatteryStatus';
import WeatherPanel from './components/WeatherPanel';
import Recommendations from './components/Recommendations';
import NotificationCenter from './components/NotificationCenter';

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAuth, setShowAuth] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [lastInput, setLastInput] = useState(null);

  const handleForecast = useCallback(async (formData) => {
    setForecastLoading(true);
    try {
      const result = await generateForecast(formData);
      setPredictions(result);
      setLastInput(formData);
      setActiveTab('dashboard');

      toast.success('Forecast generated successfully!', {
        style: {
          background: '#111827',
          color: '#f1f5f9',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        },
        iconTheme: { primary: '#10B981', secondary: '#fff' },
      });

      // Save to Firebase if authenticated
      if (user) {
        try {
          await saveUserEntry(user.uid, formData);
          await savePrediction(user.uid, {
            daily_summary: result.daily_summary,
            model_used: result.model_used,
            input: formData,
          });
          // Save surplus notification
          if (result.daily_summary?.total_surplus_kwh > 0) {
            await saveNotification(user.uid, {
              type: 'surplus',
              title: 'Surplus Energy Detected',
              message: `${result.daily_summary.total_surplus_kwh.toFixed(1)} kWh surplus forecasted`,
            });
          }
        } catch (err) {
          console.warn('Firebase save error (non-blocking):', err);
        }
      }
    } catch (err) {
      console.error('Forecast error:', err);
      toast.error(
        err.message.includes('fetch')
          ? 'Cannot connect to backend. Make sure the FastAPI server is running on localhost:8000'
          : `Forecast failed: ${err.message}`,
        {
          style: {
            background: '#111827',
            color: '#f1f5f9',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          },
          duration: 6000,
        }
      );
    } finally {
      setForecastLoading(false);
    }
  }, [user]);

  const handleAuth = (authUser) => {
    setShowAuth(false);
    toast.success(`Welcome, ${authUser.email}!`, {
      style: { background: '#111827', color: '#f1f5f9', border: '1px solid rgba(16, 185, 129, 0.3)' },
    });
  };

  // Get latest battery state from prediction
  const latestBattery = predictions?.hourly_forecast?.length
    ? predictions.hourly_forecast[predictions.hourly_forecast.length - 1]
    : null;

  // Get current battery action
  const currentAction = predictions?.hourly_forecast?.find(h => {
    const hDate = new Date(h.timestamp);
    const now = new Date();
    return hDate.getHours() === now.getHours() && hDate.getDate() === now.getDate();
  })?.battery_action || 'idle';

  return (
    <>
      <Toaster position="top-right" />
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={handleAuth}
        />
      )}

      <div className="page-container">
        {/* Header */}
        <div className="page-header fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">
              {activeTab === 'dashboard' && 'Energy Dashboard'}
              {activeTab === 'forecast' && 'Generate Forecast'}
              {activeTab === 'notifications' && 'Energy Alerts'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'dashboard' && 'Solar surplus forecasting & battery optimization'}
              {activeTab === 'forecast' && 'Configure your system and generate a 7-day prediction'}
              {activeTab === 'notifications' && 'Stay informed about your energy production & usage'}
            </p>
          </div>
          {!user && (
            <button
              className="btn btn-primary"
              onClick={() => setShowAuth(true)}
            >
              Sign In to Save Data
            </button>
          )}
        </div>

        {/* ─── Dashboard Tab ─────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            {predictions ? (
              <>
                <StatCards summary={predictions.daily_summary} />

                <div style={{ marginTop: 24 }}>
                  <ForecastChart
                    data={predictions.hourly_forecast}
                    title="48h Generation vs Consumption Forecast"
                  />
                </div>

                <div className="grid-2" style={{ marginTop: 24 }}>
                  <SurplusTimeline data={predictions.hourly_forecast} />
                  <BatteryStatus
                    soc={latestBattery?.battery_soc_percent || 50}
                    action={currentAction}
                    capacityKwh={predictions.daily_summary?.usable_battery_capacity_kwh || 10}
                    chargeKwh={latestBattery?.battery_charge_kwh || 5}
                  />
                </div>

                <div className="grid-2" style={{ marginTop: 24 }}>
                  <WeatherPanel weatherData={predictions.hourly_forecast} dataSource={predictions.weather_data_source} />
                  <Recommendations recommendations={predictions.recommendations} />
                </div>
              </>
            ) : (
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <div className="empty-state glass-card">
                  <div className="empty-state-icon">☀️</div>
                  <h3>No Forecast Yet</h3>
                  <p>Configure your solar system and generate a 7-day forecast to see your energy dashboard</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 24 }}
                    onClick={() => setActiveTab('forecast')}
                  >
                    Go to Forecast →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Forecast Tab ──────────────────────────── */}
        {activeTab === 'forecast' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <InputForm onSubmit={handleForecast} loading={forecastLoading} />
          </div>
        )}

        {/* ─── Notifications Tab ─────────────────────── */}
        {activeTab === 'notifications' && (
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <NotificationCenter predictions={predictions} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '32px 24px',
        color: 'var(--text-muted)',
        fontSize: 13,
        borderTop: '1px solid var(--border-color)',
        marginTop: 48,
      }}>
        <p>SolarSurplus — Sustainable Energy Forecasting System</p>
        <p style={{ marginTop: 4 }}>
          Powered by XGBoost + LSTM · Open-Meteo Weather API · Firebase
        </p>
      </footer>
    </>
  );
}
