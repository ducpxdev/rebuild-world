import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { apiErrorMessage, translateMessage } from '../lib/i18n';
import BrandMark from '../components/BrandMark';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setMessage('Không có mã xác minh');
      return;
    }
    api.get(`/auth/verify-email?token=${token}`)
      .then(r => { setStatus('success'); setMessage(translateMessage(r.data.message)); })
      .catch(err => { setStatus('error'); setMessage(apiErrorMessage(err, 'Xác minh thất bại')); });
  }, [params]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
      <BrandMark />
      <div className="card p-8 max-w-md w-full text-center animate-fade-in-up">
        {status === 'loading' && <Loader className="w-12 h-12 text-primary-400 mx-auto animate-spin mb-4" />}
        {status === 'success' && <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />}
        {status === 'error' && <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />}
        <h1 className="text-2xl font-bold text-ink-100 mb-2">
          {status === 'loading' ? 'Đang xác minh…' : status === 'success' ? 'Đã xác minh email!' : 'Xác minh thất bại'}
        </h1>
        <p className="text-ink-500 mb-6">{message}</p>
        {status === 'success' && (
          <Link to="/login" className="btn btn-primary">Đi tới đăng nhập</Link>
        )}
        {status === 'error' && (
          <Link to="/" className="btn btn-secondary">Về trang chủ</Link>
        )}
      </div>
    </div>
  );
}
