import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Crosshair, PenTool, User, LogOut, Search, Menu, X, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/browse?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <nav className="bg-[#0d0d18]/90 backdrop-blur-xl border-b border-cyan-500/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative">
              <Crosshair className="w-7 h-7 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              <div className="absolute inset-0 blur-md bg-cyan-400/20 rounded-full group-hover:bg-cyan-400/30 transition" />
            </div>
            <span className="hidden sm:inline font-['Rajdhani'] font-bold text-xl text-cyan-400 tracking-wider uppercase text-glow-cyan">
              Rebuild World
            </span>
          </Link>

          {/* Search bar - desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search the ruins..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:bg-slate-900/80 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition text-sm text-slate-300 placeholder-slate-600"
              />
            </div>
          </form>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/browse" className="px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition rounded-lg hover:bg-cyan-500/5">
              Browse
            </Link>
            {user ? (
              <>
                {user.is_admin && (
                  <>
                    <Link to="/create" className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 border border-cyan-500/20 transition">
                      <PenTool className="w-4 h-4" /> Write
                    </Link>
                    <Link to="/dashboard" className="px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition rounded-lg hover:bg-cyan-500/5">
                      Dashboard
                    </Link>
                  </>
                )}
                <Link to="/notifications" className="relative px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition rounded-lg hover:bg-cyan-500/5 flex items-center gap-1.5" title="Notifications">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-cyan-500 text-black text-[10px] font-bold rounded-full shadow-[0_0_8px_rgba(0,212,255,0.5)]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                {user.username && (
                  <Link to={`/user/${user.username}`} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-cyan-400 transition rounded-lg hover:bg-cyan-500/5">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover ring-1 ring-cyan-500/30" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {user.username}
                  </Link>
                )}
                <button onClick={logout} className="px-3 py-2 text-sm text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/5">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm text-slate-400 hover:text-cyan-400 transition">
                  Log In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(0,212,255,0.2)]">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-slate-400">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-slate-800 pt-3 space-y-1">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search the ruins..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:outline-none transition text-sm text-slate-300 placeholder-slate-600"
                />
              </div>
            </form>
            <Link to="/browse" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-400 rounded-lg">Browse</Link>
            {user ? (
              <>
                {user.is_admin && (
                  <>
                    <Link to="/create" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-cyan-400 font-medium hover:bg-cyan-500/10 rounded-lg">Write a Story</Link>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-slate-400 hover:bg-cyan-500/5 rounded-lg">Dashboard</Link>
                  </>
                )}
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:bg-cyan-500/5 rounded-lg">
                  Notifications {unreadCount > 0 && <span className="bg-cyan-500 text-black text-xs px-1.5 rounded-full font-bold">{unreadCount}</span>}
                </Link>
                {user.username && (
                  <Link to={`/user/${user.username}`} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-slate-400 hover:bg-cyan-500/5 rounded-lg">Profile</Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/5 rounded-lg">Log Out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-slate-400 hover:bg-cyan-500/5 rounded-lg">Log In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-cyan-400 font-medium hover:bg-cyan-500/10 rounded-lg">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
