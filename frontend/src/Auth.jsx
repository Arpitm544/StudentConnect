import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth } from './firebase.js';
import { Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Auth({ onLoginSuccess, initialIsLogin = true }) {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const cred = await getRedirectResult(auth);
        if (cred) {
          setGoogleLoading(true);
          const firebaseUser = cred.user;
          const idToken = await firebaseUser.getIdToken();

          const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: idToken }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Google login failed');

          onLoginSuccess();
        }
      } catch (err) {
        setError(err?.message || 'Google login failed');
      } finally {
        setGoogleLoading(false);
      }
    };
    handleRedirectResult();
  }, [onLoginSuccess]);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (err) {
      setError(err?.message || 'Google login failed');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');
        onLoginSuccess();
      } else {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Something went wrong');

        // Auto-login after signup
        const loginRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
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
    <div className="min-h-screen w-full flex justify-center items-center bg-[#fafafa] p-4 text-zinc-900 font-sans">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 hover:text-zinc-900 flex items-center gap-2 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to home
      </Link>
      
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-zinc-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-fade-up">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Zap size={20} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">
            {isLogin ? 'Log in to your account' : 'Create an account'}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isLogin
              ? 'Enter your details below to access your dashboard'
              : 'Join thousands of students collaborating daily'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100 flex items-start gap-2">
            <span className="mt-0.5">⚠</span>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full py-2.5 bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {googleLoading ? (
            <div className="loader !w-4 !h-4 !border-zinc-300 !border-l-zinc-700"></div>
          ) : (
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
             </svg>
          )}
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-px bg-zinc-100 flex-1" />
          <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">or sign in with email</span>
          <div className="h-px bg-zinc-100 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block mb-1.5 font-medium text-xs text-zinc-500">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required={!isLogin}
                className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block mb-1.5 font-medium text-xs text-zinc-500">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium text-xs text-zinc-500">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-zinc-900 text-white border-transparent rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-zinc-200"
          >
            {loading ? (
              <div className="loader !w-4 !h-4 !border-zinc-500 !border-l-white"></div>
            ) : isLogin ? (
               <>Sign In <ArrowRight size={16} /></>
            ) : (
               <>Create Account <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-zinc-900 font-semibold ml-1.5 hover:underline decoration-zinc-300 underline-offset-4"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
