import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Check, BookOpen } from 'lucide-react';
import api from '../lib/api';

export interface DrawerChapter { id: string; chapter_number: number; title: string; volume_id?: string | null; }
interface Volume { id: string; volume_number: number; title: string; }

interface ChapterListDrawerProps {
  storyId: string;
  storyTitle: string;
  chapters: DrawerChapter[];
  currentNumber: number;
  readIds: Set<string>;
  onClose: () => void;
}

export default function ChapterListDrawer({ storyId, storyTitle, chapters, currentNumber, readIds, onClose }: ChapterListDrawerProps) {
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(ch => ch.title.toLowerCase().includes(q) || String(ch.chapter_number) === q);
  }, [chapters, query]);

  const groups = useMemo(() => {
    const byVolume = volumes
      .map(v => ({ key: v.id, label: `Vol. ${v.volume_number}${v.title ? ` — ${v.title}` : ''}`, items: filtered.filter(ch => ch.volume_id === v.id) }))
      .filter(g => g.items.length > 0);
    const volumeIds = new Set(volumes.map(v => v.id));
    const loose = filtered.filter(ch => !ch.volume_id || !volumeIds.has(ch.volume_id));
    if (byVolume.length === 0) return [{ key: 'all', label: '', items: loose }];
    return loose.length > 0 ? [...byVolume, { key: 'other', label: 'Other chapters', items: loose }] : byVolume;
  }, [filtered, volumes]);

  const readCount = chapters.filter(ch => readIds.has(ch.id)).length;
  const readPct = chapters.length ? Math.round((readCount / chapters.length) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label="Chapter list"
        className="fixed z-[61] inset-y-0 left-0 w-[88vw] max-w-sm flex flex-col bg-[#0f0f1a] border-r border-slate-800 shadow-2xl shadow-black/60 animate-reader-slide-in"
      >
        <div className="px-5 pt-5 pb-4 border-b border-slate-800/80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contents</div>
              <Link to={`/story/${storyId}`} onClick={onClose} className="block mt-0.5 text-lg font-bold text-slate-100 hover:text-cyan-300 transition font-['Rajdhani'] tracking-wide leading-tight line-clamp-2">
                {storyTitle}
              </Link>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition shrink-0" aria-label="Close chapter list">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Personal progress across the whole story */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{readCount} of {chapters.length} chapters read</span>
              <span className="tabular-nums">{readPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all" style={{ width: `${readPct}%` }} />
            </div>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find a chapter…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 focus:border-cyan-500/50 outline-none text-sm text-slate-300 placeholder-slate-600"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-600 py-10">No chapters match “{query}”</p>
          ) : groups.map(group => (
            <div key={group.key}>
              {group.label && (
                <div className="sticky top-0 z-10 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-500/80 bg-[#0f0f1a]/95 backdrop-blur">
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
                    className={`flex items-center gap-3 px-5 py-2.5 transition group border-l-2 ${
                      isCurrent ? 'bg-cyan-500/10 border-cyan-400' : 'border-transparent hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 font-['Rajdhani'] transition ${
                      isCurrent ? 'bg-cyan-500 text-black' : isRead ? 'bg-slate-800/60 text-slate-500' : 'bg-slate-800 text-cyan-400/80 group-hover:text-cyan-300'
                    }`}>
                      {isCurrent ? <BookOpen className="w-4 h-4" /> : ch.chapter_number}
                    </span>
                    <span className={`flex-1 min-w-0 text-sm truncate ${
                      isCurrent ? 'text-cyan-200 font-medium' : isRead ? 'text-slate-500' : 'text-slate-300 group-hover:text-cyan-300'
                    }`}>
                      {ch.title}
                    </span>
                    {isRead && !isCurrent && <Check className="w-4 h-4 text-emerald-500/70 shrink-0" aria-label="Read" />}
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
