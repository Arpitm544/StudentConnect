import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL_SECONDARY || '';

export default function Verify({ onVerified }) {
  const RESEND_COOLDOWN_SECONDS = 120;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setMessage('Email verified successfully. Redirecting...');
      await onVerified();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email to resend verification');
      return;
    }
    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resend verification email');
      setMessage(data.message || 'Verification email sent');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-[#fafafa] p-4 text-zinc-900 font-sans">
      <Link to="/login" className="absolute top-6 left-6 text-zinc-400 hover:text-zinc-900 flex items-center gap-2 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to login
      </Link>

      <div className="w-full max-w-[440px] bg-white rounded-3xl border border-zinc-200 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 mb-2">Verify your email</h1>
          <p className="text-zinc-500 text-sm">
            Enter the 6-digit OTP sent to your email.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm border border-red-100">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl mb-4 text-sm border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 mb-5">
          <div>
            <label className="block mb-1.5 font-medium text-xs text-zinc-500">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-medium text-xs text-zinc-500">6-digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-zinc-900 text-white border-transparent rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="rounded-2xl border border-zinc-200 p-4 bg-zinc-50">
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-zinc-700">
            <Mail size={16} />
            <span>Did not receive an email?</span>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full py-2.5 px-3 border border-zinc-200 rounded-xl bg-white text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 shadow-sm"
            />
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="w-full py-2.5 border border-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-100 transition-all disabled:opacity-50"
            >
              {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
