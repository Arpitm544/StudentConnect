import { useState } from 'react';

export default function Auth({ onLoginSuccess, initialIsLogin = true }) {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Something went wrong');
        }

        onLoginSuccess();
      } else {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Something went wrong');
        }

        // Auto-login after successful signup so users immediately see the dashboard.
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          throw new Error(loginData.error || 'Login failed after signup');
        }

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
        <h1 className="title">{isLogin ? 'Welcome Back' : 'Create an Account'}</h1>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              required={!isLogin}
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
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </button>
      </form>

        <div className="toggle-link">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </span>
        </div>
      </div>
    </div>
  );
}
