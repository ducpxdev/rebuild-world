import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Trash2, Send, Pin, CornerDownRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

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
      setReplyError(err.response?.data?.error || 'Failed to post reply. Please try again.');
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
      <div className="flex items-center gap-4 text-slate-400 text-sm">
        {/* Like */}
        <button
          onClick={isLiked ? handleUnlike : handleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? 'text-red-400' : 'hover:text-red-400'
          } disabled:opacity-50`}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          {likes > 0 && <span className="text-xs tabular-nums">{likes}</span>}
        </button>

        {/* Replies toggle — shows count, expands thread */}
        <button
          onClick={toggleReplies}
          className={`flex items-center gap-1.5 transition-colors ${
            showReplies ? 'text-cyan-400' : 'hover:text-cyan-400'
          }`}
          title={showReplies ? 'Hide replies' : 'Show replies'}
        >
          <MessageCircle className="w-4 h-4" />
          {replyCount > 0 && <span className="text-xs tabular-nums">{replyCount}</span>}
        </button>

        {/* Reply action — opens the reply form */}
        {user && (
          <button
            onClick={() => openReplyForm()}
            className="text-xs hover:text-cyan-400 transition-colors"
          >
            Reply
          </button>
        )}

        {/* Pin (story author only) */}
        {storyAuthorId && user?.id === storyAuthorId && (
          <button
            onClick={handlePin}
            disabled={isPinning}
            className={`flex items-center gap-1 transition-colors ${
              pinned ? 'text-yellow-400' : 'hover:text-yellow-400 text-slate-400'
            } disabled:opacity-50`}
            title={pinned ? 'Unpin comment' : 'Pin comment'}
          >
            <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Replies section ── */}
      {showReplies && (
        <div className="pl-4 border-l-2 border-slate-700/60 space-y-3 pt-1">

          {/* Loading spinner */}
          {repliesLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-600 py-1">
              <div className="w-3 h-3 border border-slate-600 border-t-cyan-500/60 rounded-full animate-spin" />
              Loading replies…
            </div>
          )}

          {/* Replies list */}
          {!repliesLoading && repliesLoaded && replies.length > 0 && (
            <div className="space-y-1.5">
              {replies.map(reply => (
                <div
                  key={reply.id}
                  className="group flex gap-2 rounded-lg px-3 py-2 bg-slate-900/30 hover:bg-slate-900/50 transition"
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
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
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
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500'
                              : 'text-slate-300'
                          }`}
                        >
                          {reply.username}
                          {reply.is_admin && <span className="ml-1">✨</span>}
                        </span>
                        <span
                          className="text-[11px] text-slate-600"
                          title={new Date(reply.created_at * 1000).toLocaleString()}
                        >
                          {timeAgo(reply.created_at)}
                        </span>
                      </div>

                      {/* Per-reply actions (visible on hover) */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                        {user && (
                          <button
                            onClick={() => openReplyForm(`@${reply.username} `)}
                            className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-cyan-400 transition"
                            title={`Reply to ${reply.username}`}
                          >
                            <CornerDownRight className="w-3 h-3" />
                          </button>
                        )}
                        {(user?.id === reply.user_id || user?.is_admin) && (
                          <button
                            onClick={() => handleDeleteReply(reply.id)}
                            className="text-slate-600 hover:text-red-400 transition"
                            title="Delete reply"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mt-0.5 break-words">{reply.content}</p>
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
                  placeholder="Write a reply…"
                  maxLength={1000}
                  className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 outline-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSubmittingReply}
                  className="px-3 py-1.5 bg-cyan-500 text-black rounded hover:bg-cyan-400 transition disabled:opacity-50 flex items-center gap-1"
                  title="Post reply"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={cancelReplyForm}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded hover:bg-slate-700 transition text-xs"
                >
                  Cancel
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
