import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Mail, Lock, AlertCircle, CheckCircle, Crosshair } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');

  // If token present, show reset form
  if (token) return <ResetForm token={token} />;
  return <RequestForm />;
}

function RequestForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api.post('/auth/forgot-password', { email });
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a12]">
      <div className="w-full max-w-md animate-fade-in-up">
        <Link to="/" className="flex items-center gap-2.5 text-cyan-400 font-bold text-2xl mb-8 font-['Rajdhani'] tracking-wider uppercase">
          <Crosshair className="w-8 h-8" /> Rebuild World
        </Link>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 font-['Rajdhani']">Forgot password?</h1>
        <p className="text-slate-500 mb-8">Enter your email and we'll send you a reset link.</p>

        {sent ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-4 rounded-lg">
            <CheckCircle className="w-5 h-5 shrink-0" /> If that email exists, a reset link has been sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] text-lg tracking-wide uppercase">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a12]">
      <div className="w-full max-w-md animate-fade-in-up">
        <h1 className="text-3xl font-bold text-slate-100 mb-2 font-['Rajdhani']">Reset Password</h1>
        <p className="text-slate-500 mb-8">Enter your new password below.</p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">Password reset successful!</p>
            <Link to="/login" className="inline-block px-6 py-2.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition font-['Rajdhani'] tracking-wide uppercase">
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600" placeholder="New password (min 8 characters)" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] text-lg tracking-wide uppercase">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
