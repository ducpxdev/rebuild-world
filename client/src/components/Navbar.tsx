import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PenTool, User, LogOut, Search, Menu, X, Bell, Compass, LayoutDashboard, Home } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useScrollDirection } from '../lib/useScrollDirection';
import BrandMark from './BrandMark';
import { ThemeToggle } from './ui';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-3 h-10 rounded-xl text-sm font-medium transition ${
    isActive ? 'text-primary-300 bg-primary-500/10' : 'text-ink-400 hover:text-ink-100 hover:bg-ink-900'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 min-h-12 rounded-xl text-[15px] font-medium transition ${
    isActive ? 'text-primary-300 bg-primary-500/10' : 'text-ink-300 hover:bg-ink-900'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-hide the navbar on mobile only when the user is reading a chapter
  const isChapterPage = /^\/story\/[^/]+\/chapter\/\d+/.test(location.pathname);
  const { hidden: scrollHidden } = useScrollDirection();
  const navbarHidden = isChapterPage && scrollHidden && !mobileOpen;

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
      setMobileOpen(false);
    }
  };

  const searchField = (id: string) => (
    <form onSubmit={handleSearch} role="search" className="relative w-full">
      <label htmlFor={id} className="sr-only">Tìm kiếm truyện</label>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
      <input
        id={id}
        type="search"
        placeholder="Tìm truyện, tác giả…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input !min-h-10 !py-2 pl-10 !rounded-full text-sm"
      />
    </form>
  );

  const unreadBadge = unreadCount > 0 && (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full ring-2 ring-surface">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );

  return (
    <nav
      data-site-nav
      aria-label="Điều hướng chính"
      className={`bg-surface/85 backdrop-blur-xl border-b border-line sticky top-0 z-50 transition-transform duration-300 ease-in-out ${
        navbarHidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 h-16">
          <BrandMark compact />

          <div className="hidden md:flex items-center gap-1 ml-4">
            <NavLink to="/" end className={navLinkClass}>Trang chủ</NavLink>
            <NavLink to="/browse" className={navLinkClass}>Khám phá</NavLink>
          </div>

          {/* Search bar - desktop */}
          <div className="hidden md:block flex-1 max-w-sm ml-auto">
            {searchField('nav-search')}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            <ThemeToggle />
            {user ? (
              <>
                {user.is_admin && (
                  <>
                    <NavLink to="/dashboard" className={navLinkClass} title="Bảng điều khiển">
                      <LayoutDashboard className="w-4 h-4" /> <span className="hidden lg:inline">Quản lý</span>
                    </NavLink>
                    <Link to="/create" className="btn btn-soft btn-sm ml-1">
                      <PenTool className="w-4 h-4" /> Viết truyện
                    </Link>
                  </>
                )}
                <Link to="/notifications" className="btn-icon relative" title="Thông báo" aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}>
                  <Bell className="w-5 h-5" />
                  {unreadBadge}
                </Link>
                {user.username && (
                  <Link to={`/user/${user.username}`} className="flex items-center gap-2 pl-1.5 pr-3 h-10 rounded-full border border-line hover:border-primary-500/40 transition ml-1" title="Trang cá nhân">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-primary-500/15 text-primary-300 flex items-center justify-center"><User className="w-4 h-4" /></span>
                    )}
                    <span className="text-sm font-medium text-ink-300 max-w-[8rem] truncate">{user.username}</span>
                  </Link>
                )}
                <button type="button" onClick={logout} className="btn-icon hover:!text-red-400 hover:!bg-red-500/10" title="Đăng xuất" aria-label="Đăng xuất">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Đăng nhập</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1 ml-auto">
            <ThemeToggle />
            {user && (
              <Link to="/notifications" className="btn-icon relative" aria-label="Thông báo">
                <Bell className="w-5 h-5" />
                {unreadBadge}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn-icon"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            className="md:hidden pb-4 pt-3 border-t border-line space-y-1 animate-fade-in-up"
            onClick={e => { if ((e.target as HTMLElement).closest('a')) setMobileOpen(false); }}
          >
            <div className="mb-3">{searchField('mobile-search')}</div>
            <NavLink to="/" end className={mobileLinkClass}><Home className="w-5 h-5" /> Trang chủ</NavLink>
            <NavLink to="/browse" className={mobileLinkClass}><Compass className="w-5 h-5" /> Khám phá truyện</NavLink>
            {user ? (
              <>
                {user.is_admin && (
                  <>
                    <NavLink to="/create" className={mobileLinkClass}><PenTool className="w-5 h-5" /> Viết truyện mới</NavLink>
                    <NavLink to="/dashboard" className={mobileLinkClass}><LayoutDashboard className="w-5 h-5" /> Bảng điều khiển</NavLink>
                  </>
                )}
                <NavLink to="/notifications" className={mobileLinkClass}>
                  <Bell className="w-5 h-5" /> Thông báo
                  {unreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>}
                </NavLink>
                {user.username && (
                  <NavLink to={`/user/${user.username}`} className={mobileLinkClass}><User className="w-5 h-5" /> Trang cá nhân</NavLink>
                )}
                <button type="button" onClick={() => { logout(); setMobileOpen(false); }} className="flex w-full items-center gap-3 px-3 min-h-12 rounded-xl text-[15px] font-medium text-red-400 hover:bg-red-500/10 transition">
                  <LogOut className="w-5 h-5" /> Đăng xuất
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" className="btn btn-secondary">Đăng nhập</Link>
                <Link to="/register" className="btn btn-primary">Đăng ký</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
