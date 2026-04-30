import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
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
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
  return user?.is_admin ? <Outlet /> : <Navigate to="/" replace />;
}

function AppLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App
