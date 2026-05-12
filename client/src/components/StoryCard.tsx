import { Link } from 'react-router-dom';
import { Eye, Star, BookOpen, Image } from 'lucide-react';

const TAG_CATEGORIES = {
  light_novel: { label: 'Light Novel', color: 'bg-red-500/90' },
  web_novel: { label: 'Web Novel', color: 'bg-yellow-500/90' },
  manga: { label: 'Manga', color: 'bg-amber-500/90' },
};

const getCategoryBadge = (tags?: string) => {
  if (!tags) return null;
  const tagArray = tags.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '_'));
  const firstTag = tagArray[0];
  const category = TAG_CATEGORIES[firstTag as keyof typeof TAG_CATEGORIES];
  return category || null;
};

interface StoryCardProps {
  id: string;
  title: string;
  cover_url?: string;
  type: 'text' | 'comic';
  genre?: string;
  author_name: string;
  views: number;
  rating_avg?: number;
  rating_count?: number;
  chapter_count: number;
  status?: string;
  tags?: string;
  isLatestMode?: boolean;
  latestChapterNumber?: number;
  latestChapterTitle?: string;
}

export default function StoryCard({ id, title, cover_url, type, genre, author_name, views, rating_avg, chapter_count, status, tags, isLatestMode, latestChapterNumber, latestChapterTitle }: StoryCardProps) {
  const linkTo = isLatestMode && latestChapterNumber !== undefined
    ? `/story/${id}/chapter/${latestChapterNumber}`
    : `/story/${id}`;

  const categoryBadge = getCategoryBadge(tags);

  return (
    <Link to={linkTo} className="group block bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,212,255,0.08)]">
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
        {cover_url ? (
          <img src={cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {type === 'comic' ? (
              <Image className="w-16 h-16 text-slate-700" />
            ) : (
              <BookOpen className="w-16 h-16 text-slate-700" />
            )}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Category badge */}
        {categoryBadge ? (
          <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase ${categoryBadge.color} text-black`}>
            {categoryBadge.label}
          </span>
        ) : (
          <span className={`absolute top-3 left-3 px-2.5 py-0.5 rounded text-xs font-semibold tracking-wide uppercase ${type === 'comic' ? 'bg-amber-500/90 text-black' : 'bg-cyan-500/90 text-black'}`}>
            {type === 'comic' ? 'Comic' : 'Novel'}
          </span>
        )}
        {status && status !== 'ongoing' && (
          <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded text-xs font-semibold ${status === 'completed' ? 'bg-emerald-500/90 text-black' : 'bg-amber-500/90 text-black'}`}>
            {status}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-slate-200 line-clamp-2 group-hover:text-cyan-400 transition-colors text-sm">{title}</h3>
        {isLatestMode && latestChapterTitle && (
          <p className="text-xs text-cyan-400/80 mt-1 line-clamp-1 font-medium">Latest: {latestChapterTitle}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">by {author_name}</p>
        {genre && <span className="inline-block mt-2 px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">{genre}</span>}
        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{views}</span>
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{rating_avg ? rating_avg.toFixed(1) : '—'}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{chapter_count}</span>
        </div>
      </div>
    </Link>
  );
}
