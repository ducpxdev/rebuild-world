import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crosshair, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, updateUser } = useAuth();
  const [searchParams] = useSearchParams();

  // Handle Google OAuth callback
  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token', token);
        updateUser(user);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSuccess(`Welcome ${user.username}! Your account has been created.`);
      } catch (err) {
        console.error('Failed to parse Google auth response:', err);
      }
    }
  }, [searchParams, updateUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const msg = await register(username, email, password);
      setSuccess(msg);
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0a12]">
      {/* Left - decorative */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-[#0a0a12] to-cyan-950/30" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="relative text-center max-w-md p-12">
          <Crosshair className="w-20 h-20 mx-auto mb-6 text-cyan-500/30" />
          <h2 className="text-3xl font-bold mb-4 text-slate-200 font-['Rajdhani'] tracking-wide">Start your journey</h2>
          <p className="text-slate-500 text-lg">Read stories, leave comments, rate, and follow. The world awaits.</p>
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex items-center gap-2.5 text-cyan-400 font-bold text-2xl mb-8 font-['Rajdhani'] tracking-wider uppercase">
            <Crosshair className="w-8 h-8" /> Rebuild World
          </Link>
          <h1 className="text-3xl font-bold text-slate-100 mb-2 font-['Rajdhani']">Create your account</h1>
          <p className="text-slate-500 mb-8">Join the network</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-3 rounded-lg mb-6 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
              <Link to="/login" className="ml-auto text-cyan-400 font-medium underline">Log in</Link>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600" placeholder="survivor42" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition text-slate-200 placeholder-slate-600" placeholder="Minimum 8 characters" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] text-lg tracking-wide uppercase">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 font-medium hover:text-cyan-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
