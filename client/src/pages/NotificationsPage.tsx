import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Bell, CheckCheck, ArrowRight, BookOpen, MessageCircle, CornerDownRight } from 'lucide-react';
import { EmptyState, PageLoader, Alert } from '../components/ui';
import { apiErrorMessage, translateNotificationText } from '../lib/i18n';
import { timeAgo, formatDateTime } from '../lib/format';

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

const TYPE_ICONS: Record<string, typeof Bell> = {
  new_chapter: BookOpen,
  new_story: BookOpen,
  comment: MessageCircle,
  reply: CornerDownRight,
};

/** Vietnamese summary line, built from structured fields when available. */
function describe(n: Notification): string {
  if (n.type === 'comment' && n.commenter_username && n.story_title) {
    return n.comment_type === 'chapter' && n.chapter_number
      ? `${n.commenter_username} đã bình luận ở chương ${n.chapter_number} của “${n.story_title}”`
      : `${n.commenter_username} đã bình luận về “${n.story_title}”`;
  }
  return translateNotificationText(n.message || '');
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);

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
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể tải thông báo'));
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
    const target = notification.link || (notification.story_id ? `/story/${notification.story_id}` : '');
    if (target) navigate(target);
  };

  if (loading) return <PageLoader label="Đang tải thông báo…" />;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const visible = onlyUnread ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title text-3xl flex items-center gap-3">
            <Bell className="w-7 h-7 text-primary-400" /> Thông báo
          </h1>
          <p className="text-ink-500 mt-1 text-sm">
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead} className="btn btn-soft">
            <CheckCheck className="w-4 h-4" /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="flex gap-2 mb-4" role="group" aria-label="Lọc thông báo">
          <button type="button" onClick={() => setOnlyUnread(false)} aria-pressed={!onlyUnread} className="chip">Tất cả ({notifications.length})</button>
          <button type="button" onClick={() => setOnlyUnread(true)} aria-pressed={onlyUnread} className="chip">Chưa đọc ({unreadCount})</button>
        </div>
      )}

      {error && <Alert kind="error" className="mb-6">{error}</Alert>}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-7 h-7" />}
          title={onlyUnread ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          description="Khi có người bình luận về truyện của bạn hoặc truyện bạn theo dõi có chương mới, thông báo sẽ xuất hiện tại đây."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] ?? Bell;
            const unread = !notification.is_read;
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left rounded-2xl border transition group p-4 flex items-start gap-4 ${
                    unread
                      ? 'bg-primary-500/[0.07] border-primary-500/30 hover:border-primary-500/60'
                      : 'bg-surface border-line hover:border-ink-600'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {notification.commenter_avatar ? (
                      <img src={notification.commenter_avatar} alt="" className="w-11 h-11 rounded-full object-cover border border-line" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary-500/15 text-primary-300 flex items-center justify-center font-bold">
                        {notification.commenter_username?.[0]?.toUpperCase() ?? <Icon className="w-5 h-5" />}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center text-primary-400">
                      <Icon className="w-3 h-3" />
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-0.5 ${unread ? 'text-ink-50' : 'text-ink-300'}`}>
                      {translateNotificationText(notification.title)}
                    </h3>
                    <p className="text-sm text-ink-400 line-clamp-2">{describe(notification)}</p>
                    <p className="text-xs text-ink-500 mt-1.5" title={formatDateTime(notification.created_at)}>
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {unread && <span className="w-2.5 h-2.5 bg-primary-500 rounded-full" aria-label="Chưa đọc" />}
                    <ArrowRight className="w-4 h-4 text-ink-500 group-hover:text-primary-400 transition" />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
