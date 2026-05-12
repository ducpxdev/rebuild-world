import { User, MessageCircle } from 'lucide-react';

interface LatestComment {
  id: string;
  content: string;
  username: string;
  avatar_url?: string;
  created_at: number;
  type: 'story' | 'chapter';
  chapter_number?: number;
  chapter_title?: string;
}

interface LatestCommentsProps {
  storyId: string;
  latestComments: LatestComment[];
  isLoading: boolean;
}

export default function LatestComments({ storyId, latestComments, isLoading }: LatestCommentsProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getLocationText = (comment: LatestComment) => {
    if (comment.type === 'story') {
      return 'on story';
    } else if (comment.type === 'chapter') {
      return `in ${comment.chapter_title || 'Untitled'}`;
    }
    return '';
  };

  return (
    <div className="rounded-lg border border-slate-800/50 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-cyan-500" />
        <h3 className="text-sm font-semibold text-slate-300">Latest Comments</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-slate-800 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : latestComments.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No comments yet</p>
      ) : (
        <div className="space-y-3">
          {latestComments.map((comment) => (
            <div
              key={comment.id}
              className="group cursor-pointer hover:bg-slate-800/30 rounded p-2 transition"
              onClick={() => {
                if (comment.type === 'story') {
                  window.location.hash = `comment-${comment.id}`;
                } else {
                  window.location.href = `/story/${storyId}/chapter/${comment.chapter_number}#comment-${comment.id}`;
                }
              }}
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full flex-shrink-0 bg-slate-800 flex items-center justify-center">
                  {comment.avatar_url ? (
                    <img
                      src={comment.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-300">
                    <span className="text-slate-300">{comment.username}</span>
                    {' '}
                    <span className="text-slate-500">has commented {getLocationText(comment)}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 break-words mt-1">
                    {comment.content}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDate(comment.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
