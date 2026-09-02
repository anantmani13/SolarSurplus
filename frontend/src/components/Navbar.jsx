import { Sun, Battery, BarChart3, Bell, LogOut, Zap, Languages } from 'lucide-react';
import { logoutUser } from '../services/firebase';
import { toggleLanguage, useI18n } from '../i18n';

export default function Navbar({ user, activeTab, onTabChange }) {
  const { t, lang } = useI18n();
  const handleLogout = async () => {
    if (window.confirm(t('logout.confirm'))) {
      try {
        await logoutUser();
      } catch (err) {
        console.error('Logout error:', err);
      }
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
              {t('nav.dashboard')}
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => onTabChange('forecast')}
            >
              <BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {t('nav.forecast')}
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => onTabChange('notifications')}
            >
              <Bell size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {t('nav.alerts')}
            </button>
          </li>
          {user && (
            <li>
              <button
                className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => onTabChange('history')}
              >
                <BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('nav.history')}
              </button>
            </li>
          )}
          {user && (
            <li>
              <button className="nav-link" onClick={handleLogout} title="Logout">
                <LogOut size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('nav.logout')}
              </button>
            </li>
          )}
        </ul>

        <button
          className="btn btn-secondary nav-lang"
          onClick={toggleLanguage}
          title={lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
          style={{ padding: '6px 12px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Languages size={13} />
          {lang === 'hi' ? 'English' : 'हिंदी'}
        </button>
      </div>
    </nav>
  );
}
