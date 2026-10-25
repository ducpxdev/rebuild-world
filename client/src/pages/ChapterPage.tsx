import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  ChevronLeft, ChevronRight, MessageCircle, Send, User, Pencil, Clock, FileText, X, Shield, Eye,
  List, ArrowLeft, Timer, History, BookOpen, LogIn, RotateCcw,
} from 'lucide-react';
import CommentInteractions from '../components/CommentInteractions';
import LatestComments from '../components/LatestComments';
import ReaderSettingsPanel from '../components/ReaderSettingsPanel';
import ChapterListDrawer from '../components/ChapterListDrawer';
import type { DrawerChapter } from '../components/ChapterListDrawer';
import { useScrollDirection } from '../lib/useScrollDirection';
import { useReaderPrefs, READER_THEMES, READER_FONTS, READER_WIDTHS } from '../lib/readerPrefs';
import { getProgress, saveProgress, getReadChapters, markChapterRead } from '../lib/readingProgress';

interface Comment { id: string; content: string; username: string; user_id: string; avatar_url?: string; created_at: number; pinned?: boolean; }
interface LatestComment {
  id: string; content: string; username: string; avatar_url?: string; created_at: number;
  type: 'story' | 'chapter'; chapter_number?: number; chapter_title?: string;
}
interface ChapterData {
  id: string; story_id: string; chapter_number: number; title: string;
  content?: string; images?: string; type: 'text' | 'comic'; story_title: string;
  prev: number | null; next: number | null; comments: Comment[];
  commentCount?: number; created_at?: number; updated_at?: number; views?: number;
}

const WORDS_PER_MINUTE = 230;

// Lines made only of separator symbols ("***", "* * *", "---", "◆◆◆") are scene breaks
const SCENE_BREAK = /^[\s*\-–—=~#•·◆◇○●_]{3,}$/;

// Split plain text into paragraphs. Blank lines separate paragraphs when the author
// uses them (single newlines inside a paragraph stay as line breaks); otherwise every
// line is its own paragraph. No characters are dropped apart from the separating newlines.
const renderTextBlock = (text: string, keyPrefix: string, blankLineParagraphs: boolean): ReactNode[] => {
  const blocks = blankLineParagraphs ? text.split(/\n(?:[ \t]*\n)+/) : text.split('\n');
  return blocks
    .filter(block => block.trim())
    .map((block, i) => {
      const key = `${keyPrefix}-${i}`;
      const trimmed = block.replace(/^\n+|\n+$/g, '');
      if (SCENE_BREAK.test(trimmed)) {
        return <p key={key} className="reader-scene-break">{trimmed.trim()}</p>;
      }
      return <p key={key} className="whitespace-pre-wrap">{trimmed}</p>;
    });
};

// Parse markdown content and render with embedded images
// IMPORTANT: Only renders database-backed images from /api/images/ endpoint
// External URLs are automatically stripped during processing
const renderMarkdownContent = (content: string, imageBorder: string): ReactNode => {
  const normalized = content.replace(/\r\n?/g, '\n');
  const blankLineParagraphs = /\n[ \t]*\n/.test(normalized);

  // Split content by markdown image syntax: ![alt](/api/images/id)
  // Only database-backed URLs are rendered for security and consistency
  const parts: ReactNode[] = [];
  const imageRegex = /!\[([^\]]*)\]\(\/api\/images\/([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(normalized)) !== null) {
    // Add text before image
    if (match.index > lastIndex) {
      parts.push(...renderTextBlock(normalized.slice(lastIndex, match.index), `text-${lastIndex}`, blankLineParagraphs));
    }

    // Add image - only from /api/images/ database backend
    const [, alt, imageId] = match;
    const src = `/api/images/${imageId}`;
    parts.push(
      <div key={`img-${match.index}`} className="reader-figure">
        <img
          src={src}
          alt={alt || 'Chapter image'}
          className="w-full max-w-2xl mx-auto rounded-lg border shadow-lg"
          style={{ borderColor: imageBorder }}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            console.warn('Failed to load image:', src);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );

    lastIndex = imageRegex.lastIndex;
  }

  // Add remaining text after last image
  if (lastIndex < normalized.length) {
    parts.push(...renderTextBlock(normalized.slice(lastIndex), `text-${lastIndex}`, blankLineParagraphs));
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

const apiErrorMessage = (error: unknown, fallback: string): string =>
  (axios.isAxiosError(error) && error.response?.data?.error) || fallback;

// How far through the chapter body the reader is: 0 when its top reaches the top
// of the viewport, 1 when its bottom reaches the bottom of the viewport.
const measureProgress = (el: HTMLElement | null): number => {
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const scrollable = rect.height - window.innerHeight;
  if (scrollable <= 0) return rect.top < window.innerHeight ? 1 : 0;
  return Math.min(1, Math.max(0, -rect.top / scrollable));
};

const scrollToProgress = (el: HTMLElement | null, pct: number) => {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const top = rect.top + window.scrollY + Math.max(0, rect.height - window.innerHeight) * pct;
  window.scrollTo({ top, behavior: 'smooth' });
};

export default function ChapterPage() {
  const { id, number } = useParams<{ id: string; number: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hidden: toolbarHidden } = useScrollDirection();
  const { prefs, updatePrefs, resetPrefs } = useReaderPrefs();
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loadError, setLoadError] = useState<'not-found' | 'failed' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [storyAuthorId, setStoryAuthorId] = useState<string | null>(null);
  const [storyChapters, setStoryChapters] = useState<DrawerChapter[]>([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [latestComments, setLatestComments] = useState<LatestComment[]>([]);

  // Reader UI state
  const [openPanel, setOpenPanel] = useState<'settings' | 'contents' | null>(null);
  const [progress, setProgress] = useState(0);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const articleRef = useRef<HTMLDivElement | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  // Scroll positions are only saved once a freshly loaded chapter has settled at the top,
  // so the initial scroll reset can't overwrite the saved resume point.
  const saveEnabledRef = useRef(false);
  const markedReadRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let enableSaveTimer: number | undefined;
    saveEnabledRef.current = false;

    const loadChapter = async () => {
      try {
        const [chapterRes, latestCommentsRes, storyRes] = await Promise.all([
          api.get(`/stories/${id}/chapters/${number}`),
          api.get(`/stories/${id}/chapters/${number}/latest-comments`).catch(() => ({ data: { latestComments: [] } })),
          api.get(`/stories/${id}`).catch(() => ({ data: { author_id: null, chapters: [] } }))
        ]);
        if (cancelled) return;
        const data: ChapterData = chapterRes.data;
        setChapter(data);
        setLoadError(null);
        setComments(data.comments);
        setLatestComments(latestCommentsRes.data.latestComments || []);
        setStoryAuthorId(storyRes.data.author_id);
        setStoryChapters(storyRes.data.chapters || []);

        // Persist reading progress so StoryPage can show a "Continue" button
        if (id && data?.chapter_number) {
          const previous = getProgress(id);
          const sameChapter = previous && (previous.chapterId
            ? previous.chapterId === data.id
            : previous.chapterNumber === data.chapter_number);
          const savedPct = sameChapter ? previous.scrollPct ?? 0 : 0;
          saveProgress(id, {
            chapterNumber: data.chapter_number,
            title: data.title,
            updatedAt: Date.now(),
            chapterId: data.id,
            scrollPct: savedPct,
          });
          setReadIds(getReadChapters(id));
          // Offer to jump back to where the reader stopped — unless they came for a specific comment
          const linkedToComment = window.location.hash.startsWith('#comment-');
          setResumeAt(!linkedToComment && savedPct > 0.05 && savedPct < 0.95 ? savedPct : null);
        }
        enableSaveTimer = window.setTimeout(() => { saveEnabledRef.current = true; }, 800);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading chapter:', error);
        setLoadError(axios.isAxiosError(error) && error.response?.status === 404 ? 'not-found' : 'failed');
      }
    };
    loadChapter();
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(enableSaveTimer);
    };
  }, [id, number, reloadKey]);

  // Track scroll progress through the chapter: drives the progress bar, the
  // resume point stored for next time, and the "read" checkmarks in the contents.
  useEffect(() => {
    if (!chapter || !id) return;
    let rafId = 0;
    let saveTimer: number | undefined;

    const update = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const pct = measureProgress(articleRef.current);
        setProgress(pct);
        if (!saveEnabledRef.current) return;

        if (pct >= 0.9 && markedReadRef.current !== chapter.id) {
          markedReadRef.current = chapter.id;
          setReadIds(markChapterRead(id, chapter.id));
        }
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
          saveProgress(id, {
            chapterNumber: chapter.chapter_number,
            title: chapter.title,
            updatedAt: Date.now(),
            chapterId: chapter.id,
            scrollPct: Math.round(pct * 1000) / 1000,
          });
        }, 400);
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(saveTimer);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [chapter, id]);

  // The resume prompt is a gentle offer — it goes away on its own
  useEffect(() => {
    if (resumeAt === null) return;
    const t = window.setTimeout(() => setResumeAt(null), 12000);
    return () => window.clearTimeout(t);
  }, [resumeAt]);

  // Scroll to and highlight a comment linked as #comment-<id> (e.g. from Latest Comments)
  useEffect(() => {
    if (!chapter) return;
    let timer: number | undefined;
    const focusLinkedComment = () => {
      const hash = window.location.hash;
      if (!hash.startsWith('#comment-')) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('comment-highlight');
        void el.offsetWidth; // restart the highlight animation
        el.classList.add('comment-highlight');
      }, 150);
    };
    focusLinkedComment();
    window.addEventListener('hashchange', focusLinkedComment);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', focusLinkedComment);
    };
  }, [chapter]);

  // Keyboard: ← / → switch chapters, Esc closes reader panels
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenPanel(null);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !chapter) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const dest = e.key === 'ArrowLeft' ? chapter.prev : e.key === 'ArrowRight' ? chapter.next : null;
      if (dest === null) return;
      e.preventDefault();
      setOpenPanel(null);
      navigate(`/story/${id}/chapter/${dest}`);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [chapter, id, navigate]);

  // Show the chapter in the browser tab / history
  useEffect(() => {
    if (!chapter) return;
    const previousTitle = document.title;
    document.title = `${chapter.title} · ${chapter.story_title}`;
    return () => { document.title = previousTitle; };
  }, [chapter]);

  // Lock page scroll behind the chapter list drawer
  useEffect(() => {
    if (openPanel !== 'contents') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [openPanel]);

  const theme = READER_THEMES[prefs.theme];
  const textContent = chapter?.type === 'text' ? chapter.content : undefined;
  const imageBorder = theme.border;
  const wordCount = useMemo(() => calculateWordCount(chapter?.content), [chapter?.content]);
  const renderedContent = useMemo(
    () => (textContent ? renderMarkdownContent(textContent, imageBorder) : null),
    [textContent, imageBorder]
  );

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const r = await api.post(`/stories/${id}/chapters/${number}/comments`, { content: comment });
    setComments(prev => [...prev, r.data]);
    setComment('');
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      setDeletingCommentId(commentId);
      await api.delete(`/stories/${id}/chapters/${number}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      alert(apiErrorMessage(error, 'Failed to delete comment'));
    } finally {
      setDeletingCommentId(null);
    }
  };

  const banUserFromComments = async (userId: string, username: string) => {
    if (!window.confirm(`Ban ${username} from commenting and reviewing? This action cannot be undone.`)) return;
    try {
      setBanningUserId(userId);
      await api.post(`/users/${userId}/ban-from-comments`, {});
      alert(`${username} has been banned from commenting and reviewing`);
    } catch (error) {
      alert(apiErrorMessage(error, 'Failed to ban user'));
    } finally {
      setBanningUserId(null);
    }
  };

  const togglePanel = (panel: 'settings' | 'contents') => setOpenPanel(p => (p === panel ? null : panel));

  if (loadError) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center bg-[#12121e] rounded-xl border border-slate-800/60 p-8">
        <BookOpen className="w-10 h-10 text-cyan-500/60 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">
          {loadError === 'not-found' ? 'Chapter not found' : 'Couldn’t load this chapter'}
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          {loadError === 'not-found'
            ? 'It may have been moved or removed.'
            : 'Check your connection and try again.'}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          {loadError === 'failed' && (
            <button type="button" onClick={() => setReloadKey(k => k + 1)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-semibold rounded-lg hover:bg-cyan-400 transition text-sm">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          )}
          <Link to={`/story/${id}`} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition text-sm">
            Back to Story
          </Link>
        </div>
      </div>
    </div>
  );

  if (!chapter) return (
    <div className="max-w-6xl mx-auto px-4 py-8" aria-busy="true" aria-label="Loading chapter">
      <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-10 animate-pulse">
        <div className="h-3 w-40 bg-slate-800 rounded mb-4" />
        <div className="h-7 w-2/3 bg-slate-800 rounded mb-6" />
        <div className="h-3 w-1/2 bg-slate-800/70 rounded mb-10" />
        {[92, 100, 96, 88, 100, 70, 0, 95, 100, 84].map((w, i) => (
          <div key={i} className="h-3.5 bg-slate-800/60 rounded mb-3.5" style={{ width: `${w}%`, opacity: w ? 1 : 0 }} />
        ))}
      </div>
    </div>
  );

  const images: string[] = chapter.images ? JSON.parse(chapter.images) : [];
  const commentTotal = chapter.commentCount ?? comments.length;
  const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  const minutesLeft = Math.max(0, Math.ceil(readingMinutes * (1 - progress)));
  const chapterIndex = storyChapters.findIndex(ch => ch.chapter_number === chapter.chapter_number);
  const nextChapter = chapter.next !== null ? storyChapters.find(ch => ch.chapter_number === chapter.next) : undefined;

  const readerStyle: CSSProperties = {
    fontFamily: READER_FONTS[prefs.font].family,
    fontSize: `${prefs.fontSize}px`,
    lineHeight: prefs.lineHeight,
    color: theme.text,
  };
  const paperStyle: CSSProperties = { background: theme.paperBg, borderColor: theme.border };
  const iconBtn = 'p-2 rounded-lg hover:bg-cyan-500/5 text-slate-500 hover:text-cyan-400 transition';
  const iconBtnActive = 'p-2 rounded-lg bg-cyan-500/10 text-cyan-400 transition';

  const chapterHeader = (
    <header>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
        <Link to={`/story/${id}`} className="hover:underline underline-offset-4 truncate max-w-full" style={{ color: theme.accent }}>
          {chapter.story_title}
        </Link>
        {chapterIndex >= 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>Chapter {chapterIndex + 1} of {storyChapters.length}</span>
          </>
        )}
      </div>
      <h1 className="text-2xl md:text-3xl font-bold mb-3 font-['Rajdhani'] tracking-wide leading-tight" style={{ color: theme.heading }}>
        {chapter.title}
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm pb-5 border-b" style={{ color: theme.muted, borderColor: theme.border }}>
        {chapter.type === 'text' && (
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{(chapter.views || 0).toLocaleString()} views</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex items-center gap-1 hover:underline underline-offset-4"
          title="Jump to comments"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentTotal} {commentTotal === 1 ? 'comment' : 'comments'}</span>
        </button>
        {chapter.type === 'text' && (
          <>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>{wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span>~{readingMinutes} min read</span>
            </div>
          </>
        )}
        {chapter.updated_at && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Edited {formatTimeElapsed(chapter.updated_at)}</span>
          </div>
        )}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Reading progress — pinned to the very top so it stays visible when toolbars auto-hide */}
      <div className="fixed top-0 inset-x-0 h-[3px] z-[55] pointer-events-none" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Chapter nav bar — slides off-screen on mobile when scrolling down */}
      <div className={`sticky top-16 z-40 bg-[#0d0d18]/90 backdrop-blur-xl border-b border-slate-800/60 transition-transform duration-300 ease-in-out ${
        toolbarHidden ? '-translate-y-[7rem] md:translate-y-0' : 'translate-y-0'
      }`}>
        <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center gap-1 sm:gap-3 h-12">
          <div className="flex items-center gap-0.5 shrink-0 sm:max-w-[30%] min-w-0">
            <Link to={`/story/${id}`} className={`${iconBtn} sm:hidden`} title={`Back to ${chapter.story_title}`} aria-label="Back to story">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button type="button" onClick={() => togglePanel('contents')} className={openPanel === 'contents' ? iconBtnActive : iconBtn} title="Chapters" aria-label="Open chapter list">
              <List className="w-5 h-5" />
            </button>
            <Link to={`/story/${id}`} className="hidden sm:block text-sm text-slate-500 hover:text-cyan-400 transition truncate">
              ← {chapter.story_title}
            </Link>
          </div>

          <div className="flex-1 min-w-0 text-center leading-tight">
            <span className="block text-sm font-medium text-slate-300 font-['Rajdhani'] tracking-wide truncate">{chapter.title}</span>
            {chapter.type === 'text' && (
              <span className="hidden md:block text-[11px] text-slate-500 tabular-nums">
                {progress >= 0.99 ? 'Finished' : `${Math.round(progress * 100)}% · ${minutesLeft} min left`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => togglePanel('settings')} className={openPanel === 'settings' ? iconBtnActive : iconBtn} title="Reading settings" aria-label="Reading settings">
              <span className="block w-5 h-5 leading-5 text-center text-[15px] font-semibold" style={{ fontFamily: READER_FONTS.serif.family }} aria-hidden="true">Aa</span>
            </button>
            {user?.is_admin && (
              <Link to={`/story/${id}/chapter/${number}/edit`} className={iconBtn} title="Edit chapter">
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {chapter.prev !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.prev}`} className={iconBtn} title="Previous chapter (←)" aria-label="Previous chapter">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : <div className="w-9" />}
            {chapter.next !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.next}`} className={iconBtn} title="Next chapter (→)" aria-label="Next chapter">
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : <div className="w-9" />}
          </div>
        </div>
      </div>

      {/* Reading zone — themed by the reader's settings */}
      <div className="transition-colors duration-300" style={{ background: theme.zoneBg }}>
        <div className="mx-auto px-3 sm:px-4 py-6 md:py-10" style={{ maxWidth: READER_WIDTHS[prefs.width].maxWidth }}>
          {chapter.type === 'text' ? (
            <article
              className="-mx-3 sm:mx-0 border-y sm:border sm:rounded-xl px-5 py-7 sm:p-8 md:p-12 transition-colors duration-300"
              style={{ ...paperStyle, userSelect: 'none', WebkitUserSelect: 'none' }}
              onCopy={e => e.preventDefault()}
              onCut={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
            >
              {chapterHeader}
              <div ref={articleRef} className="reader-prose mt-8" data-align={prefs.align} style={readerStyle}>
                {renderedContent}
              </div>
            </article>
          ) : (
            <div className="space-y-4">
              <div className="-mx-3 sm:mx-0 border-y sm:border sm:rounded-xl p-6 transition-colors duration-300" style={paperStyle}>
                {chapterHeader}
              </div>
              <div
                ref={articleRef}
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

          {/* End of chapter */}
          <div className="mt-10 text-center">
            <div className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: theme.muted }}>
              <span className="h-px w-12" style={{ background: theme.border }} />
              End of chapter
              <span className="h-px w-12" style={{ background: theme.border }} />
            </div>
          </div>

          {chapter.next !== null ? (
            <Link
              to={`/story/${id}/chapter/${chapter.next}`}
              className="group mt-6 flex items-center gap-4 rounded-xl border border-cyan-500/30 bg-[#12121e] hover:border-cyan-400/70 hover:bg-[#151526] p-4 sm:p-5 transition shadow-[0_0_25px_rgba(0,212,255,0.08)]"
            >
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-500/80">Up next</div>
                <div className="mt-0.5 text-base sm:text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition font-['Rajdhani'] tracking-wide truncate">
                  {nextChapter?.title ?? 'Next chapter'}
                </div>
              </div>
              <span className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 text-black font-bold rounded-lg group-hover:bg-cyan-400 transition font-['Rajdhani'] tracking-wide uppercase text-sm">
                Next <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-800/60 bg-[#12121e] p-5 text-center">
              <div className="text-base font-bold text-slate-100 font-['Rajdhani'] tracking-wide">You’re all caught up!</div>
              <p className="text-sm text-slate-500 mt-1">This is the latest chapter. Check back soon for more.</p>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-3 mt-4">
            {chapter.prev !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.prev}`} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#12121e] border border-slate-800/60 rounded-lg text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition">
                <ChevronLeft className="w-4 h-4" /> Previous
              </Link>
            ) : <div />}
            <button type="button" onClick={() => togglePanel('contents')} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#12121e] border border-slate-800/60 rounded-lg text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition">
              <List className="w-4 h-4" /> <span className="hidden sm:inline">All chapters</span>
            </button>
            {/* "Next" lives in the Up next card above */}
            <Link to={`/story/${id}`} className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition">
              Back to Story
            </Link>
          </div>
        </div>
      </div>

      {/* Discussion */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Latest Comments */}
        {id && number && (
          <LatestComments
            storyId={id}
            latestComments={latestComments}
            isLoading={false}
          />
        )}

        {/* Comments */}
        <div ref={commentsRef} id="comments" className="mt-8 scroll-mt-32 bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100 mb-6 font-['Rajdhani'] tracking-wide">
            <MessageCircle className="w-5 h-5 text-cyan-500" /> Comments ({comments.length})
          </h3>

          {user ? (
            <form onSubmit={postComment} className="flex gap-3 mb-6">
              <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your thoughts on this chapter..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-sm text-slate-300 placeholder-slate-600" />
              <button type="submit" disabled={!comment.trim()} className="px-4 py-2.5 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition disabled:opacity-40 disabled:hover:bg-cyan-500" aria-label="Post comment">
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <Link to="/login" className="flex items-center justify-center gap-2 mb-6 px-4 py-3 rounded-lg border border-dashed border-slate-700 text-sm text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition">
              <LogIn className="w-4 h-4" /> Log in to join the discussion
            </Link>
          )}

          {comments.length === 0 ? (
            <p className="text-center text-slate-600 py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-4">
              {comments.map(c => (
                <div
                  key={c.id}
                  id={`comment-${c.id}`}
                  className={`group flex gap-3 rounded-lg p-3 hover:bg-slate-800/30 transition border scroll-mt-32 ${
                    c.pinned ? 'pinned-comment border-amber-600' : 'border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-md object-cover" /> : <User className="w-4 h-4 text-cyan-500/50" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-300">{c.username}</span>
                        <span className="text-xs text-slate-600">{new Date(c.created_at * 1000).toLocaleDateString()}</span>
                      </div>
                      {user?.is_admin && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => deleteComment(c.id)}
                            disabled={deletingCommentId === c.id}
                            className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition"
                            title="Delete comment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => banUserFromComments(c.user_id, c.username)}
                            disabled={banningUserId === c.user_id}
                            className="p-1.5 hover:bg-orange-500/20 text-slate-500 hover:text-orange-400 rounded transition"
                            title="Ban from commenting"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-1 break-words">{c.content}</p>
                    <div className="mt-2">
                      <CommentInteractions
                        commentId={c.id}
                        isStoryComment={false}
                        storyAuthorId={storyAuthorId || undefined}
                        isPinned={c.pinned || false}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resume where you left off */}
      {resumeAt !== null && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md animate-reader-toast" role="status">
          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-[#11111c]/95 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/60">
            <History className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="text-slate-200 font-medium">Pick up where you left off?</div>
              <div className="text-xs text-slate-500">You were {Math.round(resumeAt * 100)}% through this chapter</div>
            </div>
            <button
              type="button"
              onClick={() => { scrollToProgress(articleRef.current, resumeAt); setResumeAt(null); }}
              className="shrink-0 px-3 py-1.5 bg-cyan-500 text-black text-sm font-bold rounded-lg hover:bg-cyan-400 transition"
            >
              Resume
            </button>
            <button type="button" onClick={() => setResumeAt(null)} className="shrink-0 p-1 text-slate-500 hover:text-slate-200 transition" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {openPanel === 'settings' && (
        <ReaderSettingsPanel prefs={prefs} onChange={updatePrefs} onReset={resetPrefs} onClose={() => setOpenPanel(null)} />
      )}
      {openPanel === 'contents' && id && (
        <ChapterListDrawer
          storyId={id}
          storyTitle={chapter.story_title}
          chapters={storyChapters}
          currentNumber={chapter.chapter_number}
          readIds={readIds}
          onClose={() => setOpenPanel(null)}
        />
      )}
    </div>
  );
}
