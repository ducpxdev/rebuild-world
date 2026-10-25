import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiErrorMessage, translateMessage } from '../lib/i18n';
import AuthShell from '../components/AuthShell';
import { Alert } from '../components/ui';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const msg = await register(username, email, password);
      setSuccess(translateMessage(msg) || 'Tạo tài khoản thành công.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Tham gia cộng đồng độc giả Rebuild World">
      {error && (
        <Alert kind="error" className="mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </Alert>
      )}
      {success && (
        <Alert kind="success" className="mb-6 items-center">
          <CheckCircle className="w-4 h-4 shrink-0" /> <span className="flex-1">{success}</span>
          <Link to="/login" className="btn btn-primary btn-sm">Đăng nhập</Link>
        </Alert>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reg-username" className="label">Tên người dùng</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
              <input id="reg-username" type="text" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)}
                className="input !min-h-12 pl-11" placeholder="nguoisongsot42" />
            </div>
            <p className="mt-1.5 text-xs text-ink-500">3–30 ký tự, chỉ gồm chữ, số và dấu gạch dưới.</p>
          </div>
          <div>
            <label htmlFor="reg-email" className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
              <input id="reg-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input !min-h-12 pl-11" placeholder="ban@example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="reg-password" className="label">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
              <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                className="input !min-h-12 pl-11 pr-12" placeholder="Tối thiểu 8 ký tự" />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-ink-500 mt-8">
        Đã có tài khoản?{' '}
        <Link to="/login" className="text-primary-400 font-semibold hover:text-primary-300">Đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
