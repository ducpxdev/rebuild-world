import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Check, BookOpen, Image } from 'lucide-react';
import api from '../lib/api';
import { ChapterImageIcon } from './ui';

export interface DrawerChapter { id: string; chapter_number: number; title: string; volume_id?: string | null; has_images?: boolean; }
interface Volume { id: string; volume_number: number; title: string; }

interface ChapterListDrawerProps {
  storyId: string;
  storyTitle: string;
  chapters: DrawerChapter[];
  currentNumber: number;
  readIds: Set<string>;
  showImageIcons?: boolean;
  onClose: () => void;
}

export default function ChapterListDrawer({ storyId, storyTitle, chapters, currentNumber, readIds, showImageIcons = true, onClose }: ChapterListDrawerProps) {
  const [query, setQuery] = useState('');
  const [imagesOnly, setImagesOnly] = useState(false);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const currentRef = useRef<HTMLAnchorElement | null>(null);

  // Volumes are only needed for grouping, so fetch them lazily when the drawer opens
  useEffect(() => {
    let cancelled = false;
    api.get(`/stories/${storyId}/volumes`)
      .then(res => { if (!cancelled) setVolumes(res.data.volumes || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storyId]);

  // Bring the current chapter into view (re-run once volumes change the layout)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, [volumes]);

  const hasIllustrated = showImageIcons && chapters.some(ch => ch.has_images);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters.filter(ch =>
      (!imagesOnly || ch.has_images) &&
      (!q || (ch.title || '').toLowerCase().includes(q) || String(ch.chapter_number) === q));
  }, [chapters, query, imagesOnly]);

  const groups = useMemo(() => {
    const byVolume = volumes
      .map(v => ({ key: v.id, label: v.title ? `Tập ${v.volume_number} · ${v.title}` : `Tập ${v.volume_number}`, items: filtered.filter(ch => ch.volume_id === v.id) }))
      .filter(g => g.items.length > 0);
    const volumeIds = new Set(volumes.map(v => v.id));
    const loose = filtered.filter(ch => !ch.volume_id || !volumeIds.has(ch.volume_id));
    if (byVolume.length === 0) return [{ key: 'all', label: '', items: loose }];
    return loose.length > 0 ? [...byVolume, { key: 'other', label: 'Chương khác', items: loose }] : byVolume;
  }, [filtered, volumes]);

  const readCount = chapters.filter(ch => readIds.has(ch.id)).length;
  const readPct = chapters.length ? Math.round((readCount / chapters.length) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Mục lục"
        className="fixed z-[61] inset-y-0 left-0 w-[88vw] max-w-sm flex flex-col bg-elevated border-r border-line shadow-[var(--rw-shadow-lg)] animate-reader-slide-in"
      >
        <div className="px-5 pt-5 pb-4 border-b border-line">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Mục lục</div>
              <Link to={`/story/${storyId}`} onClick={onClose} className="block mt-0.5 text-lg font-bold text-ink-100 hover:text-primary-300 transition font-display leading-tight line-clamp-2">
                {storyTitle}
              </Link>
            </div>
            <button type="button" onClick={onClose} className="btn-icon -mr-2 shrink-0" aria-label="Đóng mục lục">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Personal progress across the whole story */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-ink-500 mb-1.5">
              <span>Đã đọc {readCount}/{chapters.length} chương</span>
              <span className="tabular-nums">{readPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-900 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all" style={{ width: `${readPct}%` }} />
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm chương…"
              aria-label="Tìm chương"
              className="input pl-9 !min-h-10 text-sm"
            />
          </div>
          {hasIllustrated && (
            <button type="button" onClick={() => setImagesOnly(v => !v)} aria-pressed={imagesOnly} className="chip mt-3 !min-h-8 !text-xs">
              <Image className="w-3.5 h-3.5" /> Chỉ chương có minh họa
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-ink-500 py-10">{query ? `Không có chương nào khớp với “${query}”` : 'Không có chương nào phù hợp'}</p>
          ) : groups.map(group => (
            <div key={group.key}>
              {group.label && (
                <div className="sticky top-0 z-10 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-400 bg-elevated/95 backdrop-blur border-b border-line">
                  {group.label}
                </div>
              )}
              {group.items.map(ch => {
                const isCurrent = ch.chapter_number === currentNumber;
                const isRead = readIds.has(ch.id);
                return (
                  <Link
                    key={ch.id}
                    ref={isCurrent ? currentRef : undefined}
                    to={`/story/${storyId}/chapter/${ch.chapter_number}`}
                    onClick={onClose}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex items-center gap-3 px-5 min-h-12 py-2 transition group border-l-[3px] ${
                      isCurrent ? 'bg-primary-500/10 border-primary-500' : 'border-transparent hover:bg-ink-900'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 font-display transition ${
                      isCurrent ? 'bg-primary-500 text-white' : isRead ? 'bg-ink-900 text-ink-500' : 'bg-ink-900 text-primary-400 group-hover:text-primary-300'
                    }`}>
                      {isCurrent ? <BookOpen className="w-4 h-4" /> : ch.chapter_number}
                    </span>
                    {showImageIcons && ch.has_images && <ChapterImageIcon />}
                    <span className={`flex-1 min-w-0 text-sm truncate ${
                      isCurrent ? 'text-primary-300 font-semibold' : isRead ? 'text-ink-500' : 'text-ink-200 group-hover:text-primary-300'
                    }`}>
                      {ch.title}
                    </span>
                    {isRead && !isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Đã đọc" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
