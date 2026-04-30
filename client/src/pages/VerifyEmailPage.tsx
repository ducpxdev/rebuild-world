import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }
    api.get(`/auth/verify-email?token=${token}`)
      .then(r => { setStatus('success'); setMessage(r.data.message); })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.error || 'Verification failed'); });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a12]">
      <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-8 max-w-md w-full text-center animate-fade-in-up">
        {status === 'loading' && <Loader className="w-12 h-12 text-cyan-500 mx-auto animate-spin mb-4" />}
        {status === 'success' && <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />}
        {status === 'error' && <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />}
        <h1 className="text-2xl font-bold text-slate-100 mb-2 font-['Rajdhani']">
          {status === 'loading' ? 'Verifying...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
        </h1>
        <p className="text-slate-500 mb-6">{message}</p>
        {status === 'success' && (
          <Link to="/login" className="inline-block px-6 py-2.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition font-['Rajdhani'] tracking-wide uppercase">
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}
