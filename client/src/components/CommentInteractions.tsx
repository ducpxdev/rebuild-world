import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, Send, Pin } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

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

  // Like state
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Reply state
  const [replyCount, setReplyCount] = useState(0);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplies, setShowReplies] = useState(true);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

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

  // On mount: load interaction status (likes, user liked, reply count) and
  // eagerly fetch replies so they are visible immediately.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const [statusRes, repliesRes] = await Promise.all([
          api.get(likeCountEndpoint),
          api.get(repliesEndpoint),
        ]);

        if (cancelled) return;

        setLikes(statusRes.data.likeCount ?? 0);
        setIsLiked(statusRes.data.userLiked ?? false);
        setReplyCount(statusRes.data.replyCount ?? 0);

        const loadedReplies: Reply[] = repliesRes.data.replies ?? [];
        setReplies(loadedReplies);
        setReplyCount(loadedReplies.length);
        setRepliesLoaded(true);
      } catch (error) {
        console.error('Error initialising comment interactions:', error);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [commentId, isStoryComment]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyText.trim() || isSubmittingReply) return;
    setIsSubmittingReply(true);
    try {
      const res = await api.post(repliesEndpoint, { content: replyText });
      setReplies(prev => [...prev, res.data]);
      setReplyCount(prev => prev + 1);
      setReplyText('');
      setShowReplies(true);
    } catch (error) {
      console.error('Error posting reply:', error);
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
      {/* Action bar */}
      <div className="flex items-center gap-4 text-slate-400 text-sm">
        {/* Like button */}
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

        {/* Reply toggle button */}
        <button
          onClick={() => setShowReplies(v => !v)}
          className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
          title={showReplies ? 'Hide replies' : 'Show replies'}
        >
          <MessageCircle className="w-4 h-4" />
          {replyCount > 0 && <span className="text-xs tabular-nums">{replyCount}</span>}
        </button>

        {/* Pin button (story author only) */}
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

      {/* Replies section — always rendered once loaded, toggled by button */}
      {showReplies && (
        <div className="pl-4 border-l-2 border-slate-700/60 space-y-2">
          {/* Reply form */}
          {user && (
            <form onSubmit={handleReply} className="flex gap-2 pt-1">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-700/50 rounded text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 outline-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                className="px-3 py-1.5 bg-cyan-500 text-black rounded hover:bg-cyan-400 transition disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Replies list */}
          {repliesLoaded && (
            <div className="space-y-2">
              {replies.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No replies yet</p>
              ) : (
                replies.map(reply => (
                  <div key={reply.id} className="flex gap-2 bg-slate-900/30 rounded-lg px-3 py-2">
                    <div className="shrink-0 mt-0.5">
                      {reply.avatar_url ? (
                        <img src={reply.avatar_url} alt={reply.username} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          {reply.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-300">
                          {reply.username}
                          {reply.is_admin && <span className="ml-1 text-amber-400">✨</span>}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-600">
                            {new Date(reply.created_at * 1000).toLocaleDateString()}
                          </span>
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
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
