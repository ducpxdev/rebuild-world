import { Link } from 'react-router-dom';
import { Eye, Star, BookOpen, Image, Bookmark } from 'lucide-react';
import { getCategoryBadge, genreLabel, statusLabel, typeLabel } from '../lib/i18n';
import { getProgress } from '../lib/readingProgress';
import { formatCompact } from '../lib/format';

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
  const progress = getProgress(id);
  const firstGenre = genre?.split(',').map(g => g.trim()).filter(Boolean)[0];

  return (
    <Link
      to={linkTo}
      className="group flex flex-col bg-surface rounded-2xl border border-line overflow-hidden shadow-[var(--rw-shadow)] hover:-translate-y-1 hover:shadow-[var(--rw-shadow-lg)] hover:border-primary-500/40 transition-all duration-300"
    >
      {/* Cover */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-ink-900 to-ink-800 overflow-hidden">
        {cover_url ? (
          <img src={cover_url} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {type === 'comic' ? <Image className="w-14 h-14 text-ink-600" /> : <BookOpen className="w-14 h-14 text-ink-600" />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />

        <span className={`badge absolute top-2.5 left-2.5 shadow-sm ${categoryBadge ? categoryBadge.badgeColor : type === 'comic' ? 'bg-orange-500 text-white' : 'bg-sky-500 text-white'}`}>
          {categoryBadge ? categoryBadge.label : typeLabel(type)}
        </span>
        {status && status !== 'ongoing' && (
          <span className={`badge absolute top-2.5 right-2.5 shadow-sm ${status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-black'}`}>
            {statusLabel(status)}
          </span>
        )}

        {/* Bottom overlay: stats on the cover */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 flex items-center gap-2.5 text-[11px] font-medium text-white/90">
          <span className="flex items-center gap-1" title="Lượt xem"><Eye className="w-3.5 h-3.5" />{formatCompact(views)}</span>
          <span className="flex items-center gap-1" title="Đánh giá"><Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{rating_avg ? rating_avg.toFixed(1) : '—'}</span>
          <span className="flex items-center gap-1 ml-auto" title="Số chương"><BookOpen className="w-3.5 h-3.5" />{chapter_count}</span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col p-3">
        <h3 className="font-semibold text-ink-100 line-clamp-2 group-hover:text-primary-300 transition-colors text-sm leading-snug">{title}</h3>
        {isLatestMode && latestChapterTitle && (
          <p className="text-xs text-primary-400 mt-1 line-clamp-1 font-medium">Mới: {latestChapterTitle}</p>
        )}
        <p className="text-xs text-ink-500 mt-1 truncate">{author_name}</p>
        <div className="mt-auto pt-2 flex items-center gap-1.5 flex-wrap">
          {progress && !isLatestMode ? (
            <span className="badge bg-primary-500/12 text-primary-300" title={progress.title ? `Đang đọc: ${progress.title}` : undefined}>
              <Bookmark className="w-3 h-3" /> Đang đọc · Chương {progress.chapterNumber}
            </span>
          ) : firstGenre ? (
            <span className="badge bg-ink-900 text-ink-400 font-medium">{genreLabel(firstGenre)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
