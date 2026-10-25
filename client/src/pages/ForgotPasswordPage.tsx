import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { apiErrorMessage } from '../lib/i18n';
import AuthShell from '../components/AuthShell';
import { Alert } from '../components/ui';

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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Quên mật khẩu?" subtitle="Nhập email của bạn, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.">
      {error && <Alert kind="error" className="mb-6"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}</Alert>}
      {sent ? (
        <Alert kind="success">
          <CheckCircle className="w-5 h-5 shrink-0" /> Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
              <input id="forgot-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input !min-h-12 pl-11" placeholder="ban@example.com" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
          </button>
        </form>
      )}
      <Link to="/login" className="btn btn-ghost mt-6 -ml-3"><ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập</Link>
    </AuthShell>
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
    } catch (err) {
      setError(apiErrorMessage(err, 'Đặt lại mật khẩu thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản của bạn.">
      {error && (
        <Alert kind="error" className="mb-6">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </Alert>
      )}
      {success ? (
        <div className="card p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-ink-300 mb-6">Đặt lại mật khẩu thành công!</p>
          <Link to="/login" className="btn btn-primary">Đi tới đăng nhập</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-password" className="label">Mật khẩu mới</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
              <input id="reset-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                className="input !min-h-12 pl-11" placeholder="Tối thiểu 8 ký tự" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
