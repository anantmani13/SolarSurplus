import { useState } from 'react';
import { registerUser, loginUser, loginWithGoogle } from '../services/firebase';
import { Zap, Mail, Lock, X } from 'lucide-react';

function friendlyAuthError(err) {
  const code =
    err?.code || err?.message?.split('(')?.[1]?.replace(')', '') || '';
  const msg = err?.message || 'Authentication failed';
  if (msg.includes('not configured')) {
    return 'Firebase is not configured. Add your Firebase credentials to the .env file.';
  }
  const map = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password. Try again',
    'auth/invalid-credential': 'Invalid email or password',
    'auth/invalid-email': 'Enter a valid email address',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before finishing',
    'auth/cancelled-popup-request': 'Sign-in popup was cancelled',
    'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Allow popups and try again',
    'auth/unauthorized-domain': 'This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings',
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Sign in with email/password instead',
    'auth/network-request-failed': 'Network error. Check your connection and try again',
    'auth/too-many-requests': 'Too many attempts. Wait a bit and try again',
  };
  return map[code] || msg;
}

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

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
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuth(user);
    } catch (err) {
      setError(friendlyAuthError(err));
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
              ? 'Sign in to access and save your solar forecasts'
              : 'Start optimizing your solar energy usage'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogle}
          disabled={loading}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <>
              <GoogleIcon size={18} />
              Continue with Google
            </>
          )}
        </button>

        <div className="auth-divider">
          <span>or sign in with email</span>
        </div>

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
