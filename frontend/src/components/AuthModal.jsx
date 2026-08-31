import { useState } from 'react';
import { registerUser, loginUser } from '../services/firebase';
import { Zap, Mail, Lock, X } from 'lucide-react';

export default function AuthModal({ onClose, onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = isLogin
        ? await loginUser(email, password)
        : await registerUser(email, password);
      onAuth(user);
    } catch (err) {
      const msg = err.message || 'Authentication failed';
      if (msg.includes('not configured')) {
        setError('Firebase is not configured. Add your Firebase credentials to .env file.');
      } else if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists');
      } else if (msg.includes('weak-password')) {
        setError('Password should be at least 6 characters');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-icon btn-secondary"
            onClick={onClose}
            style={{ marginBottom: 8 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="navbar-brand-icon" style={{ margin: '0 auto 16px', width: 48, height: 48 }}>
            <Zap size={24} color="white" />
          </div>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="subtitle">
            {isLogin
              ? 'Sign in to access your solar forecasts'
              : 'Start optimizing your solar energy usage'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <span className="spinner" />
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
