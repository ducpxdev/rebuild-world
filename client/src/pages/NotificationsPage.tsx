import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Bell, Check, ArrowRight } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  commenter_id: string;
  commenter_username: string;
  commenter_avatar: string;
  story_id: string;
  story_title: string;
  comment_id: string;
  comment_type: 'series' | 'chapter';
  chapter_number?: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: number;
  created_at: number;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: 1 } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    navigate(notification.link);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] to-[#1a1a2e] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-cyan-500" />
            <h1 className="text-3xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">
              Notifications
            </h1>
          </div>
          {notifications.some(n => !n.is_read) && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition font-medium text-sm"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No notifications yet</p>
            <p className="text-slate-500 text-sm mt-2">When people comment on your stories, you'll see them here</p>
          </div>
        )}

        {/* Notifications List */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border transition group cursor-pointer ${
                  notification.is_read
                    ? 'bg-slate-800/30 border-slate-800/40 hover:bg-slate-800/50 hover:border-slate-700/60'
                    : 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15 hover:border-cyan-500/50'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Avatar */}
                  <img
                    src={notification.commenter_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.commenter_username}`}
                    alt={notification.commenter_username}
                    className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-700/50"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h3 className={`font-semibold mb-1 ${
                          notification.is_read
                            ? 'text-slate-300'
                            : 'text-cyan-300'
                        }`}>
                          {notification.title}
                        </h3>

                        {/* Message */}
                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                          <span className="font-medium text-slate-300">{notification.commenter_username}</span> commented
                          {notification.comment_type === 'chapter' ? (
                            <> on Chapter {notification.chapter_number} of </>
                          ) : (
                            <> on </>
                          )}
                          <span className="font-medium text-slate-300">"{notification.story_title}"</span>
                        </p>

                        {/* Date */}
                        <p className="text-xs text-slate-500">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>

                      {/* Unread Badge & Arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
