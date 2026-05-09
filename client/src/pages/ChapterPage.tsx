import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ChevronLeft, ChevronRight, MessageCircle, Send, User, Pencil, Clock, FileText } from 'lucide-react';

interface Comment { id: string; content: string; username: string; avatar_url?: string; created_at: number; }
interface ChapterData {
  id: string; story_id: string; chapter_number: number; title: string;
  content?: string; images?: string; type: 'text' | 'comic'; story_title: string;
  prev: number | null; next: number | null; comments: Comment[];
  commentCount?: number; created_at?: number; updated_at?: number;
}
// Parse markdown content and render with embedded images
// IMPORTANT: Only renders database-backed images from /api/images/ endpoint
// External URLs are automatically stripped during processing
const renderMarkdownContent = (content: string): ReactNode => {
  // Split content by markdown image syntax: ![alt](/api/images/id)
  // Only database-backed URLs are rendered for security and consistency
  const parts: (string | ReactNode)[] = [];
  const imageRegex = /!\[([^\]]*)\]\(\/api\/images\/([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    // Add text before image
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {textBefore}
          </p>
        );
      }
    }

    // Add image - only from /api/images/ database backend
    const [, alt, imageId] = match;
    const src = `/api/images/${imageId}`;
    parts.push(
      <div key={`img-${match.index}`} className="my-4">
        <img
          src={src}
          alt={alt || 'Chapter image'}
          className="w-full max-w-2xl mx-auto rounded-lg border border-slate-700 shadow-lg"
          loading="lazy"
          onError={(e) => {
            console.warn('Failed to load image:', src);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {alt && <p className="text-center text-sm text-slate-500 mt-2 italic">{alt}</p>}
      </div>
    );

    lastIndex = imageRegex.lastIndex;
  }

  // Add remaining text after last image
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    if (textAfter.trim()) {
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {textAfter}
        </p>
      );
    }
  }

  // If no database-backed images found, just return the content as is
  if (parts.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  return parts;
};

// Helper to format time elapsed since last edit
const formatTimeElapsed = (timestamp: number | undefined): string => {
  if (!timestamp) return 'Unknown';
  const now = Math.floor(Date.now() / 1000);
  const seconds = now - timestamp;
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

// Helper to calculate word count from content
const calculateWordCount = (content: string | undefined): number => {
  if (!content) return 0;
  // Remove markdown image syntax and split by whitespace
  const cleaned = content.replace(/!\[([^\]]*)\]\(\/api\/images\/[^)]+\)/g, '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
};

export default function ChapterPage() {
  const { id, number } = useParams<{ id: string; number: string }>();
  const { user } = useAuth();
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    api.get(`/stories/${id}/chapters/${number}`).then(r => {
      setChapter(r.data);
      setComments(r.data.comments);
    });
    window.scrollTo(0, 0);
  }, [id, number]);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const r = await api.post(`/stories/${id}/chapters/${number}/comments`, { content: comment });
    setComments(prev => [...prev, r.data]);
    setComment('');
  };

  if (!chapter) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const images: string[] = chapter.images ? JSON.parse(chapter.images) : [];

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Chapter nav bar */}
      <div className="sticky top-16 z-40 bg-[#0d0d18]/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-12">
          <Link to={`/story/${id}`} className="text-sm text-slate-500 hover:text-cyan-400 transition truncate max-w-[40%]">
            ← {chapter.story_title}
          </Link>
          <span className="text-sm font-medium text-slate-300 font-['Rajdhani'] tracking-wide">{chapter.title}</span>
          <div className="flex items-center gap-1">
            {user?.is_admin && (
              <Link to={`/story/${id}/chapter/${number}/edit`} className="p-2 rounded-lg hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 transition" title="Edit chapter">
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {chapter.prev !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.prev}`} className="p-2 rounded-lg hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 transition">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : <div className="w-9" />}
            {chapter.next !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.next}`} className="p-2 rounded-lg hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 transition">
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : <div className="w-9" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {chapter.type === 'text' ? (
          <article
            className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-10"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            onCopy={e => e.preventDefault()}
            onCut={e => e.preventDefault()}
            onContextMenu={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
          >
            <h1 className="text-2xl font-bold text-slate-100 mb-2 font-['Rajdhani'] tracking-wide">{chapter.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-6 pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{chapter.commentCount ?? comments.length} {(chapter.commentCount ?? comments.length) === 1 ? 'comment' : 'comments'}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span>{calculateWordCount(chapter.content).toLocaleString()} words</span>
              </div>
              {chapter.updated_at && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Edited {formatTimeElapsed(chapter.updated_at)}</span>
                </div>
              )}
            </div>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              {chapter.content && renderMarkdownContent(chapter.content)}
            </div>
          </article>
        ) : (
          <div className="space-y-4">
            <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
              <h1 className="text-2xl font-bold text-slate-100 mb-2 font-['Rajdhani'] tracking-wide">{chapter.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{chapter.commentCount ?? comments.length} {(chapter.commentCount ?? comments.length) === 1 ? 'comment' : 'comments'}</span>
                </div>
                {chapter.updated_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Edited {formatTimeElapsed(chapter.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
            <div
              className="space-y-2"
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
            >
              {images.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} className="w-full rounded-lg border border-slate-800/40 pointer-events-none" loading="lazy" draggable={false} />
              ))}
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-8">
          {chapter.prev !== null ? (
            <Link to={`/story/${id}/chapter/${chapter.prev}`} className="flex items-center gap-2 px-5 py-2.5 bg-[#12121e] border border-slate-800/60 rounded-lg text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Link>
          ) : <div />}
          {chapter.next !== null ? (
            <Link to={`/story/${id}/chapter/${chapter.next}`} className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition font-['Rajdhani'] tracking-wide uppercase">
              Next <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to={`/story/${id}`} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition">
              Back to Story
            </Link>
          )}
        </div>

        {/* Comments */}
        <div className="mt-12 bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100 mb-6 font-['Rajdhani'] tracking-wide">
            <MessageCircle className="w-5 h-5 text-cyan-500" /> Comments ({comments.length})
          </h3>

          {user && (
            <form onSubmit={postComment} className="flex gap-3 mb-6">
              <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-sm text-slate-300 placeholder-slate-600" />
              <button type="submit" className="px-4 py-2.5 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition">
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          {comments.length === 0 ? (
            <p className="text-center text-slate-600 py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-md object-cover" /> : <User className="w-4 h-4 text-cyan-500/50" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-300">{c.username}</span>
                      <span className="text-xs text-slate-600">{new Date(c.created_at * 1000).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
