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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
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

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#0a0a12] text-slate-500">Or sign up with</span>
                </div>
              </div>

              <a href={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/auth/google`}
                className="w-full py-3 px-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </a>
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
