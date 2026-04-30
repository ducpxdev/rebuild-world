import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Bell, BookOpen, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  is_read: number;
  created_at: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/notifications').then(r => {
      setNotifications(r.data.notifications);
    }).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await api.post('/users/me/notifications/read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">Notifications</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllRead} className="flex items-center gap-1 px-4 py-2 text-sm text-cyan-400 hover:bg-cyan-500/5 rounded-lg border border-cyan-500/20 transition">
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-[#12121e] rounded-xl border border-slate-800/60">
          <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No notifications yet</h3>
          <p className="text-slate-600">Follow authors to get notified when they publish new stories!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const inner = (
              <div className={`flex items-start gap-4 p-4 rounded-xl border transition ${
                n.is_read ? 'bg-[#12121e] border-slate-800/60' : 'bg-cyan-500/5 border-cyan-500/15'
              }`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-slate-800' : 'bg-cyan-500/10'
                }`}>
                  <BookOpen className={`w-5 h-5 ${n.is_read ? 'text-slate-600' : 'text-cyan-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${n.is_read ? 'text-slate-400' : 'text-slate-200'}`}>{n.title}</p>
                  {n.message && <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>}
                  <p className="text-xs text-slate-600 mt-1">{new Date(n.created_at * 1000).toLocaleString()}</p>
                </div>
                {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(0,212,255,0.5)]" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} className="block hover:shadow-[0_0_15px_rgba(0,212,255,0.05)]">{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
