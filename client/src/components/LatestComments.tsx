import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { timeAgo } from '../lib/format';
import { UserName, UserAvatar } from './UserName';

interface LatestComment {
  id: string;
  content: string;
  username: string;
  avatar_url?: string;
  role?: string | null;
  is_admin?: number | boolean;
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
  const navigate = useNavigate();
  const location = useLocation();

  const getLocationText = (comment: LatestComment) => {
    if (comment.type === 'story') return 'về bộ truyện';
    if (comment.type === 'chapter') return `trong ${comment.chapter_title || 'chương không tên'}`;
    return '';
  };

  const openComment = (comment: LatestComment) => {
    const path = comment.type === 'story'
      ? `/story/${storyId}`
      : `/story/${storyId}/chapter/${comment.chapter_number}`;
    const hash = `comment-${comment.id}`;
    if (location.pathname === path) {
      // Same page: changing the hash scrolls to (and highlights) the comment
      window.location.assign(`#${hash}`);
    } else {
      navigate(`${path}#${hash}`);
    }
  };

  return (
    <section className="card p-4" aria-label="Bình luận mới nhất">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-5 h-5 text-primary-400" />
        <h3 className="text-sm font-bold text-ink-200 font-display">Bình luận mới nhất</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="skeleton h-3 w-3/4 mb-2" />
              <div className="skeleton h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : latestComments.length === 0 ? (
        <p className="text-sm text-ink-500 italic">Chưa có bình luận nào</p>
      ) : (
        <ul className="space-y-1">
          {latestComments.map((comment) => (
            <li key={comment.id} className="flex items-start gap-2.5 rounded-xl p-2 hover:bg-ink-900 transition">
              <UserAvatar username={comment.username} src={comment.avatar_url} size="w-7 h-7" textSize="text-[11px]" />
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-snug">
                  <UserName username={comment.username} role={comment.role} isAdmin={comment.is_admin} className="font-semibold" />
                  {' '}
                  <button type="button" onClick={() => openComment(comment)} className="text-ink-500 hover:text-primary-300 text-left transition">
                    đã bình luận {getLocationText(comment)}
                  </button>
                </div>
                <button type="button" onClick={() => openComment(comment)} className="block w-full text-left" aria-label={`Xem bình luận của ${comment.username}`}>
                  <p className="text-[13px] text-ink-300 line-clamp-2 break-words mt-0.5">
                    {comment.content}
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    {timeAgo(comment.created_at)}
                  </p>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
