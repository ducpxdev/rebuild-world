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
  onPinChange
}: CommentDisplayProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [pinned, setPinned] = useState(isPinned);

  // Load like count
  useEffect(() => {
    const loadLikes = async () => {
      try {
        const endpoint = isStoryComment 
          ? `/comments/story/${commentId}/likes-count`
          : `/comments/${commentId}/likes-count`;
        const res = await api.get(endpoint);
        setLikes(res.data.likeCount);
      } catch (error) {
        console.error('Error loading likes:', error);
      }
    };

    loadLikes();
  }, [commentId, isStoryComment]);

  const handleLike = async () => {
    if (!user || likeLoading) return;

    setLikeLoading(true);
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/like`
        : `/comments/${commentId}/like`;

      const res = await api.post(endpoint);
      setLikes(res.data.likeCount);
      setIsLiked(true);
    } catch (error: any) {
      if (error.response?.status === 400) {
        setIsLiked(true);
      }
      console.error('Error liking comment:', error);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleUnlike = async () => {
    if (!user || likeLoading) return;

    setLikeLoading(true);
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/like`
        : `/comments/${commentId}/like`;

      const res = await api.delete(endpoint);
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
      if (onPinChange) {
        onPinChange(res.data.pinned);
      }
    } catch (error) {
      console.error(`Error ${pinned ? 'unpinning' : 'pinning'} comment:`, error);
    } finally {
      setIsPinning(false);
    }
  };

  const loadReplies = async () => {
    if (isLoadingReplies) return;

    setIsLoadingReplies(true);
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/replies`
        : `/comments/${commentId}/replies`;
      
      const res = await api.get(endpoint);
      setReplies(res.data.replies || []);
      setShowReplies(true);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const endpoint = isStoryComment
        ? `/comments/story/${commentId}/replies`
        : `/comments/${commentId}/replies`;

      const res = await api.post(endpoint, { content: replyText });
      setReplies([...replies, res.data]);
      setReplyText('');
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
      setReplies(replies.filter(r => r.id !== replyId));
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  return (
    <div className="space-y-3">
      {/* Like and Reply Buttons */}
      <div className="flex items-center gap-4 text-slate-400 text-sm">
        <button
          onClick={isLiked ? handleUnlike : handleLike}
          disabled={!user || likeLoading}
          className={`flex items-center gap-1 transition ${
            isLiked ? 'text-red-400' : 'hover:text-red-400'
          } disabled:opacity-50`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-xs">{likes > 0 ? likes : ''}</span>
        </button>

        <button
          onClick={loadReplies}
          disabled={!user || isLoadingReplies}
          className="flex items-center gap-1 hover:text-cyan-400 transition disabled:opacity-50"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{replies.length > 0 ? replies.length : ''}</span>
        </button>

        {storyAuthorId && user?.id === storyAuthorId && (
          <button
            onClick={handlePin}
            disabled={isPinning}
            className={`flex items-center gap-1 transition ${
              pinned ? 'text-yellow-400' : 'hover:text-yellow-400 text-slate-400'
            } disabled:opacity-50`}
            title={pinned ? 'Unpin comment' : 'Pin comment'}
          >
            <Pin className={`w-4 h-4 ${pinned ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Replies Section */}
      {showReplies && (
        <div className="space-y-3 pl-4 border-l border-slate-700">
          {/* Reply Form */}
          {user && (
            <form onSubmit={handleReply} className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 outline-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || isSubmittingReply}
                className="px-3 py-2 bg-cyan-500 text-black rounded hover:bg-cyan-400 transition disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Replies List */}
          <div className="space-y-2">
            {replies.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No replies yet</p>
            ) : (
              replies.map((reply) => (
                <div key={reply.id} className="bg-slate-900/30 p-2 rounded text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={reply.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.username}`}
                        alt={reply.username}
                        className="w-6 h-6 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-300 text-xs">
                          {reply.username}
                          {reply.is_admin && <span className="ml-1 text-amber-400">⭐</span>}
                        </p>
                        <p className="text-slate-300 break-words">{reply.content}</p>
                      </div>
                    </div>
                    {user?.id === reply.user_id && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="hover:text-red-400 transition shrink-0"
                        title="Delete reply"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(reply.created_at * 1000).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
