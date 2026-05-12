import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crosshair, Mail, Lock, AlertCircle, Clock } from 'lucide-react';
import { rateLimiting, isRateLimitError, getRetryAfter, formatRetryTime } from '../lib/rateLimit';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRateLimited(false);
    setRetryAfter(null);

    // Check frontend rate limiting
    const rateLimitCheck = rateLimiting.login.isAllowed();
    if (!rateLimitCheck.allowed) {
      setError(rateLimitCheck.error || 'Too many login attempts. Please try again later.');
      setIsRateLimited(true);
      setRetryAfter(rateLimitCheck.retryAfter ? Math.ceil(rateLimitCheck.retryAfter / 1000) : null);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Success - reset rate limiter
      rateLimiting.login.reset();
      navigate('/');
    } catch (err) {
      rateLimiting.login.recordAttempt();

      // Check if it's a rate limit error from backend
      if (isRateLimitError(err)) {
        const retrySeconds = getRetryAfter(err);
        setIsRateLimited(true);
        setRetryAfter(retrySeconds);
        const errorMsg = (err as any).response?.data?.error || `Too many login attempts. Please try again in ${formatRetryTime(retrySeconds || 60)}.`;
        setError(errorMsg);
      } else {
        const error = err as { response?: { data?: { error: string } } };
        setError(error.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const remaining = rateLimiting.login.getRemaining();
  const remainingTime = rateLimiting.login.getRemainingTime();

  return (
    <div className="min-h-screen flex bg-[#0a0a12]">
      {/* Left - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex items-center gap-2.5 text-cyan-400 font-bold text-2xl mb-8 font-['Rajdhani'] tracking-wider uppercase">
            <Crosshair className="w-8 h-8" /> Rebuild World
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 font-['Rajdhani']">Welcome back</h1>
          <p className="text-slate-500 mb-8">Sign in to continue your journey</p>

          {error && (
            <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 text-sm border ${
              isRateLimited 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {isRateLimited ? (
                <Clock className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {error}
            </div>
          )}

          {!isRateLimited && remaining < 5 && (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 p-3 rounded-lg mb-6 text-sm">
              <Clock className="w-4 h-4 shrink-0" /> 
              {remaining} login attempt{remaining !== 1 ? 's' : ''} remaining before temporary lockout
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={isRateLimited}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isRateLimited}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="••••••••" />
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-cyan-400/70 hover:text-cyan-400">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading || isRateLimited}
              className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] text-lg tracking-wide uppercase">
              {loading ? 'Signing in...' : isRateLimited ? `Try again in ${remainingTime}s` : 'Sign In'}
            </button>

            {isRateLimited && retryAfter && (
              <p className="text-center text-xs text-slate-500">
                Access will be restored in {formatRetryTime(retryAfter)}
              </p>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 font-medium hover:text-cyan-300">Sign up</Link>
          </p>
        </div>
      </div>

      {/* Right - decorative */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-[#0a0a12] to-indigo-950/20" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="relative text-center max-w-md p-12">
          <Crosshair className="w-20 h-20 mx-auto mb-6 text-cyan-500/30" />
          <h2 className="text-3xl font-bold mb-4 text-slate-200 font-['Rajdhani'] tracking-wide">Every story matters</h2>
          <p className="text-slate-500 text-lg">In a world of ruins, stories are what keep us human.</p>
        </div>
      </div>
    </div>
  );
}
