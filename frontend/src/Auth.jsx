import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase.js';

export default function Auth({ onLoginSuccess, initialIsLogin = true }) {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const cred = await signInWithPopup(auth, provider);
      const firebaseUser = cred.user;
      if (!firebaseUser) throw new Error('Google sign-in failed');

      const idToken = await firebaseUser.getIdToken();
      if (!idToken) throw new Error('Failed to get Firebase ID token');

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Google login failed');

      onLoginSuccess();
    } catch (err) {
      setError(err?.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');
        onLoginSuccess();
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');

        // Auto-login after signup
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) throw new Error(loginData.error || 'Login failed after signup');
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            fontSize: '1.5rem'
          }}>⚡</div>
          <h1 className="title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="auth-subtitle">
            {isLogin
              ? 'Sign in to your StudentConnect workspace'
              : 'Join thousands of students collaborating daily'}
          </p>
        </div>

        {error && <div className="error-message">⚠ {error}</div>}

        <button
          type="button"
          className="btn"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          style={{
            marginBottom: '1rem',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          {googleLoading ? '⏳ Signing in...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0 1.25rem' }}>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', flex: 1 }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.06em' }}>
            OR
          </span>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', flex: 1 }} />
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading
              ? '⏳ Please wait...'
              : isLogin ? 'Sign In →' : 'Create Account →'}
          </button>
        </form>

        <div className="toggle-link">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? ' Sign up free' : ' Sign in'}
          </span>
        </div>
      </div>
    </div>
  );
}
