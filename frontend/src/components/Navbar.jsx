import { Sun, Battery, BarChart3, Bell, LogOut, Zap } from 'lucide-react';
import { logoutUser } from '../services/firebase';

export default function Navbar({ user, activeTab, onTabChange }) {
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="/" className="navbar-brand">
          <div className="navbar-brand-icon">
            <Zap size={20} color="white" />
          </div>
          <div className="navbar-brand-text">
            Solar<span>Surplus</span>
          </div>
        </a>

        <ul className="navbar-nav">
          <li>
            <button
              className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onTabChange('dashboard')}
            >
              <Sun size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Dashboard
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => onTabChange('forecast')}
            >
              <BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Forecast
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => onTabChange('notifications')}
            >
              <Bell size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Alerts
            </button>
          </li>
          {user && (
            <li>
              <button
                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => onTabChange('history')}
              >
                <BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                History
              </button>
            </li>
          )}
          {user && (
            <li>
              <button className="nav-link" onClick={handleLogout} title="Logout">
                <LogOut size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Logout
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
