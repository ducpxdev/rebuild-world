import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { rateLimiting, isRateLimitError, getRetryAfter, formatRetryTime } from '../lib/rateLimit';
import { apiErrorMessage } from '../lib/i18n';
import AuthShell from '../components/AuthShell';
import { Alert } from '../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setError(rateLimitCheck.error || 'Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau.');
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
        setError(apiErrorMessage(err, `Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${formatRetryTime(retrySeconds || 60)}.`));
      } else {
        setError(apiErrorMessage(err, 'Đăng nhập thất bại'));
      }
    } finally {
      setLoading(false);
    }
  };

  const remaining = rateLimiting.login.getRemaining();
  const remainingTime = rateLimiting.login.getRemainingTime();

  return (
    <AuthShell title="Chào mừng trở lại" subtitle="Đăng nhập để tiếp tục hành trình đọc truyện của bạn">
      {error && (
        <Alert kind={isRateLimited ? 'warning' : 'error'} className="mb-6">
          {isRateLimited ? <Clock className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {error}
        </Alert>
      )}

      {!isRateLimited && remaining < 5 && (
        <Alert kind="warning" className="mb-6">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          Còn {remaining} lần thử trước khi tài khoản bị tạm khóa đăng nhập
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={isRateLimited}
              className="input !min-h-12 pl-11" placeholder="ban@example.com" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="login-password" className="label !mb-0">Mật khẩu</label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary-400 hover:text-primary-300">Quên mật khẩu?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
            <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={isRateLimited}
              className="input !min-h-12 pl-11 pr-12" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading || isRateLimited} className="btn btn-primary btn-lg w-full">
          {loading ? 'Đang đăng nhập…' : isRateLimited ? `Thử lại sau ${remainingTime} giây` : 'Đăng nhập'}
        </button>

        {isRateLimited && retryAfter && (
          <p className="text-center text-xs text-ink-500">
            Bạn có thể đăng nhập lại sau {formatRetryTime(retryAfter)}
          </p>
        )}
      </form>

      <p className="text-center text-sm text-ink-500 mt-8">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="text-primary-400 font-semibold hover:text-primary-300">Đăng ký ngay</Link>
      </p>
    </AuthShell>
  );
}
