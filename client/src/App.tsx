import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import SiteFooter from './components/SiteFooter';
import { PageLoader } from './components/ui';
import { Compass } from 'lucide-react';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowsePage from './pages/BrowsePage';
import StoryPage from './pages/StoryPage';
import ChapterPage from './pages/ChapterPage';
import CreateStoryPage from './pages/CreateStoryPage';
import AddChapterPage from './pages/AddChapterPage';
import EditStoryPage from './pages/EditStoryPage';
import EditChapterPage from './pages/EditChapterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import NotificationsPage from './pages/NotificationsPage';

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user?.is_admin ? <Outlet /> : <Navigate to="/" replace />;
}

// Start each new page at the top (hash links such as #comment-<id> scroll themselves)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] btn btn-primary">
        Chuyển đến nội dung chính
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-ink-100">Không tìm thấy trang</h1>
      <p className="mt-2 text-ink-500">Trang bạn tìm có thể đã bị di chuyển hoặc không còn tồn tại.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/" className="btn btn-primary">Về trang chủ</Link>
        <Link to="/browse" className="btn btn-secondary">Khám phá truyện</Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Auth pages — no navbar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />

          {/* Pages with navbar */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/story/:id" element={<StoryPage />} />
            <Route path="/story/:id/chapter/:number" element={<ChapterPage />} />
            <Route path="/user/:username" element={<ProfilePage />} />

            {/* Protected routes — any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/create" element={<CreateStoryPage />} />
              <Route path="/story/:id/add-chapter" element={<AddChapterPage />} />
              <Route path="/story/:id/edit" element={<EditStoryPage />} />
              <Route path="/story/:id/chapter/:number/edit" element={<EditChapterPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App
