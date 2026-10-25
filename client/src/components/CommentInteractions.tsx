import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Trash2, Send, Pin, CornerDownRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { timeAgo, formatDateTime } from '../lib/format';
import { apiErrorMessage } from '../lib/i18n';

interface Reply {
  id: string;
  content: string;
  username: string;
  avatar_url?: string;
  created_at: number;
  user_id: string;
  is_admin?: boolean;
}

interface CommentDisplayProps {
  commentId: string;
  isStoryComment?: boolean;
  storyAuthorId?: string;
  isPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
}

export default function CommentInteractions({
  commentId,
  isStoryComment = false,
  storyAuthorId,
  isPinned = false,
  onPinChange,
}: CommentDisplayProps) {
  const { user } = useAuth();
  const replyInputRef = useRef<HTMLInputElement>(null);

  // Like state
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Reply state
  const [replyCount, setReplyCount] = useState(0);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Pin state
  const [isPinning, setIsPinning] = useState(false);
  const [pinned, setPinned] = useState(isPinned);

  const likeCountEndpoint = isStoryComment
    ? `/comments/story/${commentId}/likes-count`
    : `/comments/${commentId}/likes-count`;

  const repliesEndpoint = isStoryComment
    ? `/comments/story/${commentId}/replies`
    : `/comments/${commentId}/replies`;

  const likeEndpoint = isStoryComment
    ? `/comments/story/${commentId}/like`
    : `/comments/${commentId}/like`;

  // On mount: load only counts — replies are lazy-loaded on first expand.
  useEffect(() => {
    let cancelled = false;
    api.get(likeCountEndpoint).then(res => {
      if (cancelled) return;
      setLikes(res.data.likeCount ?? 0);
      setIsLiked(res.data.userLiked ?? false);
      setReplyCount(res.data.replyCount ?? 0);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [commentId, isStoryComment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch replies from the server (idempotent — skips if already loaded).
  const ensureRepliesLoaded = async () => {
    if (repliesLoaded) return;
    setRepliesLoading(true);
    try {
      const res = await api.get(repliesEndpoint);
      const loaded: Reply[] = res.data.replies ?? [];
      setReplies(loaded);
      setReplyCount(loaded.length);
      setRepliesLoaded(true);
    } catch {
      setRepliesLoaded(true); // Don't block the UI on error.
    } finally {
      setRepliesLoading(false);
    }
  };

  // Toggle the replies list, fetching on first open.
  const toggleReplies = async () => {
    if (!showReplies) await ensureRepliesLoaded();
    setShowReplies(v => !v);
  };

  // Open the reply form, expanding the replies list if needed.
  const openReplyForm = async (prefill = '') => {
    if (!showReplies) {
      await ensureRepliesLoaded();
      setShowReplies(true);
    }
    setReplyText(prefill);
    setShowReplyForm(true);
    setTimeout(() => replyInputRef.current?.focus(), 50);
  };

  const cancelReplyForm = () => {
    setShowReplyForm(false);
    setReplyText('');
    setReplyError('');
  };

  const handleLike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await api.post(likeEndpoint);
      setLikes(res.data.likeCount);
      setIsLiked(true);
    } catch (error: any) {
      if (error.response?.status === 400) setIsLiked(true);
      console.error('Error liking comment:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleUnlike = async () => {
    if (!user || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await api.delete(likeEndpoint);
      setLikes(res.data.likeCount);
      setIsLiked(false);
    } catch (error) {
      console.error('Error unliking comment:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePin = async () => {
    if (!user || !storyAuthorId || user.id !== storyAuthorId || isPinning) return;
    setIsPinning(true);
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/${pinned ? 'unpin' : 'pin'}`
        : `/comments/${commentId}/${pinned ? 'unpin' : 'pin'}`;
      const res = await api.post(endpoint);
      setPinned(res.data.pinned);
      onPinChange?.(res.data.pinned);
    } catch (error) {
      console.error(`Error ${pinned ? 'unpinning' : 'pinning'} comment:`, error);
    } finally {
      setIsPinning(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    setReplyError('');
    try {
      const res = await api.post(repliesEndpoint, { content: replyText.trim() });
      setReplies(prev => [...prev, res.data]);
      setReplyCount(prev => prev + 1);
      setReplyText('');
      setShowReplyForm(false);
    } catch (err: any) {
      setReplyError(apiErrorMessage(err, 'Không thể gửi phản hồi. Vui lòng thử lại.'));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!user) return;
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/replies/${replyId}`
        : `/comments/${commentId}/replies/${replyId}`;
      await api.delete(endpoint);
      setReplies(prev => prev.filter(r => r.id !== replyId));
      setReplyCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  return (
    <div className="space-y-2">
      {/* ── Action bar ── */}
      <div className="flex items-center gap-1 -ml-2 text-ink-500 text-sm">
        {/* Like */}
        <button
          onClick={isLiked ? handleUnlike : handleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-1.5 px-2 min-h-8 rounded-lg transition-colors ${
            isLiked ? 'text-rose-500' : 'hover:text-rose-500 hover:bg-rose-500/10'
          } disabled:opacity-50`}
          title={!user ? 'Đăng nhập để thích bình luận' : isLiked ? 'Bỏ thích' : 'Thích'}
          aria-pressed={isLiked}
          aria-label={isLiked ? 'Bỏ thích' : 'Thích'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          {likes > 0 && <span className="text-xs tabular-nums">{likes}</span>}
        </button>

        {/* Replies toggle — shows count, expands thread */}
        <button
          onClick={toggleReplies}
          className={`flex items-center gap-1.5 px-2 min-h-8 rounded-lg transition-colors ${
            showReplies ? 'text-primary-300 bg-primary-500/10' : 'hover:text-primary-300 hover:bg-primary-500/10'
          }`}
          title={showReplies ? 'Ẩn phản hồi' : 'Xem phản hồi'}
          aria-expanded={showReplies}
        >
          <MessageCircle className="w-4 h-4" />
          {replyCount > 0 ? <span className="text-xs tabular-nums">{replyCount} phản hồi</span> : <span className="sr-only">Phản hồi</span>}
        </button>

        {/* Reply action — opens the reply form */}
        {user && (
          <button
            onClick={() => openReplyForm()}
            className="px-2 min-h-8 rounded-lg text-xs font-medium hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
          >
            Trả lời
          </button>
        )}

        {/* Pin (story author only) */}
        {storyAuthorId && user?.id === storyAuthorId && (
          <button
            onClick={handlePin}
            disabled={isPinning}
            className={`flex items-center gap-1 px-2 min-h-8 rounded-lg transition-colors ${
              pinned ? 'text-amber-400' : 'hover:text-amber-400 hover:bg-amber-500/10'
            } disabled:opacity-50`}
            title={pinned ? 'Bỏ ghim bình luận' : 'Ghim bình luận'}
            aria-pressed={pinned}
            aria-label={pinned ? 'Bỏ ghim bình luận' : 'Ghim bình luận'}
          >
            <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Replies section ── */}
      {showReplies && (
        <div className="ml-1 pl-4 border-l-2 border-line space-y-3 pt-1">

          {/* Loading spinner */}
          {repliesLoading && (
            <div className="flex items-center gap-2 text-xs text-ink-500 py-1">
              <div className="w-3.5 h-3.5 border-2 border-ink-700 border-t-primary-500 rounded-full animate-spin" />
              Đang tải phản hồi…
            </div>
          )}

          {/* Replies list */}
          {!repliesLoading && repliesLoaded && replies.length > 0 && (
            <div className="space-y-1.5">
              {replies.map(reply => (
                <div
                  key={reply.id}
                  className="group flex gap-2.5 rounded-xl px-3 py-2.5 bg-ink-900/60 hover:bg-ink-900 transition"
                >
                  {/* Avatar */}
                  <div className="shrink-0 mt-0.5">
                    {reply.avatar_url ? (
                      <img
                        src={reply.avatar_url}
                        alt={reply.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary-500/15 flex items-center justify-center text-[10px] text-primary-300 font-bold">
                        {reply.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            reply.is_admin
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500'
                              : 'text-ink-200'
                          }`}
                        >
                          {reply.username}
                          {reply.is_admin && <span className="ml-1">✨</span>}
                        </span>
                        <span
                          className="text-[11px] text-ink-500"
                          title={formatDateTime(reply.created_at)}
                        >
                          {timeAgo(reply.created_at)}
                        </span>
                      </div>

                      {/* Per-reply actions (visible on hover) */}
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                        {user && (
                          <button
                            onClick={() => openReplyForm(`@${reply.username} `)}
                            className="p-1.5 rounded-md text-ink-500 hover:text-primary-300 hover:bg-primary-500/10 transition"
                            title={`Trả lời ${reply.username}`}
                            aria-label={`Trả lời ${reply.username}`}
                          >
                            <CornerDownRight className="w-3 h-3" />
                          </button>
                        )}
                        {(user?.id === reply.user_id || user?.is_admin) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="p-1.5 rounded-md text-ink-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Xóa phản hồi"
                            aria-label="Xóa phản hồi"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-ink-300 mt-0.5 break-words leading-relaxed">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply form */}
          {showReplyForm && user && (
            <form onSubmit={handleSubmitReply} className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Viết phản hồi…"
                  aria-label="Nội dung phản hồi"
                  maxLength={1000}
                  className="input flex-1 !min-h-9 !py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSubmittingReply}
                  className="btn btn-primary btn-sm"
                  title="Gửi phản hồi"
                  aria-label="Gửi phản hồi"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelReplyForm}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy
                </button>
              </div>
              {replyError && (
                <p className="text-xs text-red-400">{replyError}</p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
