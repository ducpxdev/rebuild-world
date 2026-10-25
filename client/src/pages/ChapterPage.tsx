import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import {
  ChevronLeft, ChevronRight, MessageCircle, Send, User, Pencil, Clock, FileText, X, Shield, Eye,
  List, ArrowLeft, Timer, History, BookOpen, LogIn, RotateCcw, Maximize2, Minimize2, Settings2, ArrowUp,
} from 'lucide-react';
import { ChapterImageIcon } from '../components/ui';
import { apiErrorMessage } from '../lib/i18n';
import { formatDate, formatNumber, timeAgo } from '../lib/format';
import CommentInteractions from '../components/CommentInteractions';
import LatestComments from '../components/LatestComments';
import ReaderSettingsPanel from '../components/ReaderSettingsPanel';
import ChapterListDrawer from '../components/ChapterListDrawer';
import type { DrawerChapter } from '../components/ChapterListDrawer';
import { useScrollDirection } from '../lib/useScrollDirection';
import { useReaderPrefs, READER_THEMES, READER_FONTS, READER_WIDTHS, READER_SPACINGS } from '../lib/readerPrefs';
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
          alt={alt || 'Hình minh họa'}
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
const formatTimeElapsed = (timestamp: number | undefined): string => timeAgo(timestamp, 3650);

// Helper to calculate word count from content
const calculateWordCount = (content: string | undefined): number => {
  if (!content) return 0;
  // Remove markdown image syntax and split by whitespace
  const cleaned = content.replace(/!\[([^\]]*)\]\(\/api\/images\/[^)]+\)/g, '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
};

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
  const { showToast } = useToast();
  const { hidden: toolbarHidden } = useScrollDirection();
  const { prefs, updatePrefs, resetPrefs } = useReaderPrefs();
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loadError, setLoadError] = useState<'not-found' | 'failed' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [storyAuthorId, setStoryAuthorId] = useState<string | null>(null);
  const [storyChapters, setStoryChapters] = useState<DrawerChapter[]>([]);
  const [storyCover, setStoryCover] = useState<string | undefined>(undefined);
  const [focusMode, setFocusMode] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
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
          api.get(`/stories/${id}`).catch(() => ({ data: { author_id: null, chapters: [], cover_url: undefined } }))
        ]);
        if (cancelled) return;
        const data: ChapterData = chapterRes.data;
        setChapter(data);
        setLoadError(null);
        setComments(data.comments);
        setLatestComments(latestCommentsRes.data.latestComments || []);
        setStoryAuthorId(storyRes.data.author_id);
        setStoryChapters(storyRes.data.chapters || []);
        setStoryCover(storyRes.data.cover_url);

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
            storyTitle: data.story_title,
            coverUrl: storyRes.data.cover_url,
            totalChapters: storyRes.data.chapters?.length,
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
            storyTitle: chapter.story_title,
            coverUrl: storyCover,
            totalChapters: storyChapters.length || undefined,
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
  }, [chapter, id, storyCover, storyChapters.length]);

  // Distraction-free mode hides the site chrome (see `body.reader-focus` in index.css)
  useEffect(() => {
    document.body.classList.toggle('reader-focus', focusMode);
    return () => document.body.classList.remove('reader-focus');
  }, [focusMode]);

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
        setFocusMode(false);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !chapter) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setOpenPanel(null);
        setFocusMode(v => !v);
        return;
      }
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
    if (!comment.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const r = await api.post(`/stories/${id}/chapters/${number}/comments`, { content: comment });
      setComments(prev => [...prev, r.data]);
      setComment('');
    } catch (error) {
      showToast(apiErrorMessage(error, 'Không thể gửi bình luận'), 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      setDeletingCommentId(commentId);
      await api.delete(`/stories/${id}/chapters/${number}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      showToast('Đã xóa bình luận', 'success');
    } catch (error) {
      showToast(apiErrorMessage(error, 'Không thể xóa bình luận'), 'error');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const banUserFromComments = async (userId: string, username: string) => {
    if (!window.confirm(`Cấm ${username} bình luận và đánh giá? Thao tác này không thể hoàn tác.`)) return;
    try {
      setBanningUserId(userId);
      await api.post(`/users/${userId}/ban-from-comments`, {});
      showToast(`Đã cấm ${username} bình luận và đánh giá`, 'success');
    } catch (error) {
      showToast(apiErrorMessage(error, 'Không thể cấm người dùng'), 'error');
    } finally {
      setBanningUserId(null);
    }
  };

  const togglePanel = (panel: 'settings' | 'contents') => setOpenPanel(p => (p === panel ? null : panel));

  if (loadError) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="card max-w-md w-full text-center p-8">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary-500/10 text-primary-400 flex items-center justify-center">
          <BookOpen className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-ink-100">
          {loadError === 'not-found' ? 'Không tìm thấy chương' : 'Không thể tải chương này'}
        </h1>
        <p className="text-sm text-ink-500 mt-2">
          {loadError === 'not-found'
            ? 'Chương có thể đã bị di chuyển hoặc gỡ bỏ.'
            : 'Vui lòng kiểm tra kết nối mạng và thử lại.'}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          {loadError === 'failed' && (
            <button type="button" onClick={() => setReloadKey(k => k + 1)} className="btn btn-primary">
              <RotateCcw className="w-4 h-4" /> Thử lại
            </button>
          )}
          <Link to={`/story/${id}`} className="btn btn-secondary">
            Về trang truyện
          </Link>
        </div>
      </div>
    </div>
  );

  if (!chapter) return (
    <div className="max-w-3xl mx-auto px-4 py-8" aria-busy="true" aria-label="Đang tải chương">
      <div className="card p-6 md:p-10">
        <div className="skeleton h-3 w-40 mb-4" />
        <div className="skeleton h-7 w-2/3 mb-6" />
        <div className="skeleton h-3 w-1/2 mb-10" />
        {[92, 100, 96, 88, 100, 70, 0, 95, 100, 84].map((w, i) => (
          <div key={i} className="skeleton h-3.5 mb-3.5" style={{ width: `${w}%`, opacity: w ? 1 : 0 }} />
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
  const prevChapter = chapter.prev !== null ? storyChapters.find(ch => ch.chapter_number === chapter.prev) : undefined;
  const hasIllustrations = chapter.type === 'text' && /!\[[^\]]*\]\(\/api\/images\//.test(chapter.content || '');
  const progressLabel = progress >= 0.99 ? 'Đã đọc xong' : `${Math.round(progress * 100)}% · còn ${minutesLeft} phút`;

  const readerStyle = {
    fontFamily: READER_FONTS[prefs.font].family,
    fontSize: `${prefs.fontSize}px`,
    lineHeight: prefs.lineHeight,
    color: theme.text,
    '--reader-paragraph-gap': READER_SPACINGS[prefs.spacing].gap,
  } as CSSProperties;
  const paperStyle: CSSProperties = { background: theme.paperBg, borderColor: theme.border };
  const iconBtn = 'btn-icon';
  const iconBtnActive = 'btn-icon is-active';

  const chapterHeader = (
    <header>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: theme.muted }}>
        <Link to={`/story/${id}`} className="hover:underline underline-offset-4 truncate max-w-full" style={{ color: theme.accent }}>
          {chapter.story_title}
        </Link>
        {chapterIndex >= 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>Chương {chapterIndex + 1}/{storyChapters.length}</span>
          </>
        )}
      </div>
      <h1 className="flex items-start gap-2.5 text-2xl md:text-[2rem] font-bold mb-4 leading-tight" style={{ color: theme.heading }}>
        {hasIllustrations && <ChapterImageIcon className="mt-1.5 md:mt-2" />}
        <span>{chapter.title}</span>
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm pb-6 border-b" style={{ color: theme.muted, borderColor: theme.border }}>
        {chapter.type === 'text' && (
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{formatNumber(chapter.views || 0)} lượt xem</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex items-center gap-1.5 hover:underline underline-offset-4"
          title="Đi tới bình luận"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentTotal} bình luận</span>
        </button>
        {chapter.type === 'text' && (
          <>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{formatNumber(wordCount)} chữ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer className="w-4 h-4" />
              <span>~{readingMinutes} phút đọc</span>
            </div>
          </>
        )}
        {chapter.updated_at && (
          <div className="flex items-center gap-1.5" title={formatDate(chapter.updated_at)}>
            <Clock className="w-4 h-4" />
            <span>Cập nhật {formatTimeElapsed(chapter.updated_at)}</span>
          </div>
        )}
      </div>
    </header>
  );

  const navLinkBtn = 'btn btn-secondary flex-1 sm:flex-none min-w-0';

  return (
    <div className="min-h-screen pb-16 md:pb-0 transition-colors duration-300" style={{ background: theme.zoneBg }}>
      {/* Reading progress — pinned to the very top so it stays visible when toolbars auto-hide */}
      <div className="fixed top-0 inset-x-0 h-[3px] z-[55] pointer-events-none" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Chapter nav bar — slides off-screen on mobile when scrolling down */}
      <div data-reader-chrome className={`sticky top-16 z-40 bg-surface/90 backdrop-blur-xl border-b border-line transition-transform duration-300 ease-in-out ${
        toolbarHidden ? '-translate-y-[7rem] md:translate-y-0' : 'translate-y-0'
      }`}>
        <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center gap-1 sm:gap-3 h-14">
          <div className="flex items-center gap-0.5 shrink-0 sm:max-w-[30%] min-w-0">
            <Link to={`/story/${id}`} className={`${iconBtn} sm:hidden`} title={`Về ${chapter.story_title}`} aria-label="Về trang truyện">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button type="button" onClick={() => togglePanel('contents')} className={openPanel === 'contents' ? iconBtnActive : iconBtn} title="Mục lục" aria-label="Mở mục lục">
              <List className="w-5 h-5" />
            </button>
            <Link to={`/story/${id}`} className="hidden sm:block text-sm text-ink-400 hover:text-primary-300 transition truncate">
              ← {chapter.story_title}
            </Link>
          </div>

          <div className="flex-1 min-w-0 text-center leading-tight">
            <span className="block text-sm font-semibold text-ink-200 truncate">{chapter.title}</span>
            {chapter.type === 'text' && (
              <span className="hidden md:block text-[11px] text-ink-500 tabular-nums">{progressLabel}</span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => togglePanel('settings')} className={openPanel === 'settings' ? iconBtnActive : iconBtn} title="Cài đặt đọc" aria-label="Cài đặt đọc">
              <span className="block w-5 h-5 leading-5 text-center text-[15px] font-semibold" style={{ fontFamily: READER_FONTS.serif.family }} aria-hidden="true">Aa</span>
            </button>
            <button type="button" onClick={() => { setOpenPanel(null); setFocusMode(true); }} className={`${iconBtn} hidden sm:inline-flex`} title="Chế độ tập trung (F)" aria-label="Bật chế độ đọc tập trung">
              <Maximize2 className="w-[18px] h-[18px]" />
            </button>
            {user?.is_admin && (
              <Link to={`/story/${id}/chapter/${number}/edit`} className={`${iconBtn} hidden sm:inline-flex`} title="Sửa chương" aria-label="Sửa chương">
                <Pencil className="w-4 h-4" />
              </Link>
            )}
            {chapter.prev !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.prev}`} className={`${iconBtn} hidden md:inline-flex`} title="Chương trước (←)" aria-label="Chương trước">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : <span className="hidden md:inline-block w-10" />}
            {chapter.next !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.next}`} className={`${iconBtn} hidden md:inline-flex`} title="Chương sau (→)" aria-label="Chương sau">
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : <span className="hidden md:inline-block w-10" />}
          </div>
        </div>
      </div>

      {/* Reading zone — themed by the reader's settings */}
      <div>
        <div className="mx-auto px-3 sm:px-4 py-6 md:py-10" style={{ maxWidth: READER_WIDTHS[prefs.width].maxWidth }}>
          {chapter.type === 'text' ? (
            <article
              className="-mx-3 sm:mx-0 border-y sm:border sm:rounded-2xl px-5 py-8 sm:px-10 sm:py-10 md:px-14 md:py-12 transition-colors duration-300 shadow-[var(--rw-shadow)]"
              style={{ ...paperStyle, userSelect: 'none', WebkitUserSelect: 'none' }}
              onCopy={e => e.preventDefault()}
              onCut={e => e.preventDefault()}
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
            >
              {chapterHeader}
              <div ref={articleRef} lang="vi" className="reader-prose mt-8" data-align={prefs.align} data-indent={prefs.indent} style={readerStyle}>
                {renderedContent}
              </div>
            </article>
          ) : (
            <div className="space-y-4">
              <div className="-mx-3 sm:mx-0 border-y sm:border sm:rounded-2xl p-6 transition-colors duration-300" style={paperStyle}>
                {chapterHeader}
              </div>
              <div
                ref={articleRef}
                className="space-y-1 -mx-3 sm:mx-0"
                onContextMenu={e => e.preventDefault()}
                onDragStart={e => e.preventDefault()}
              >
                {images.map((src, i) => (
                  <img key={i} src={src} alt={`Trang ${i + 1}`} className="w-full sm:rounded-lg pointer-events-none" loading="lazy" draggable={false} />
                ))}
              </div>
            </div>
          )}

          {/* End of chapter */}
          <div className="mt-10 text-center">
            <div className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: theme.muted }}>
              <span className="h-px w-12" style={{ background: theme.border }} />
              Hết chương
              <span className="h-px w-12" style={{ background: theme.border }} />
            </div>
          </div>

          {chapter.next !== null ? (
            <Link
              to={`/story/${id}/chapter/${chapter.next}`}
              className="group mt-6 flex items-center gap-4 rounded-2xl border border-primary-500/30 bg-surface hover:border-primary-500/70 p-4 sm:p-5 transition shadow-[var(--rw-shadow)]"
            >
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary-400">Chương tiếp theo</div>
                <div className="mt-0.5 flex items-center gap-2 text-base sm:text-lg font-bold text-ink-100 group-hover:text-primary-300 transition font-display">
                  {nextChapter?.has_images && <ChapterImageIcon />}
                  <span className="truncate">{nextChapter?.title ?? 'Chương sau'}</span>
                </div>
              </div>
              <span className="btn btn-primary shrink-0">
                Đọc tiếp <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          ) : (
            <div className="mt-6 card p-5 text-center">
              <div className="text-base font-bold text-ink-100 font-display">Bạn đã đọc hết các chương hiện có!</div>
              <p className="text-sm text-ink-500 mt-1">Đây là chương mới nhất. Hãy quay lại sau để đọc chương tiếp theo nhé.</p>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 mt-4">
            {chapter.prev !== null ? (
              <Link to={`/story/${id}/chapter/${chapter.prev}`} className={navLinkBtn} title={prevChapter?.title}>
                <ChevronLeft className="w-4 h-4 shrink-0" /> <span className="truncate">Chương trước</span>
              </Link>
            ) : <div className="flex-1 sm:flex-none" />}
            <button type="button" onClick={() => togglePanel('contents')} className={navLinkBtn}>
              <List className="w-4 h-4 shrink-0" /> <span className="truncate">Mục lục</span>
            </button>
            <Link to={`/story/${id}`} className={navLinkBtn}>
              <BookOpen className="w-4 h-4 shrink-0" /> <span className="truncate hidden sm:inline">Về trang truyện</span><span className="sm:hidden">Truyện</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Discussion */}
      <div className="bg-canvas border-t border-line">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* Latest Comments */}
          {id && number && (
            <LatestComments
              storyId={id}
              latestComments={latestComments}
              isLoading={false}
            />
          )}

          {/* Comments */}
          <section ref={commentsRef} id="comments" className="mt-8 scroll-mt-32 card p-5 sm:p-6">
            <h2 className="section-title flex items-center gap-2 text-lg mb-5">
              <MessageCircle className="w-5 h-5 text-primary-400" /> Bình luận <span className="text-ink-500 font-medium text-base">({comments.length})</span>
            </h2>

            {user ? (
              <form onSubmit={postComment} className="flex gap-2 mb-6">
                <label htmlFor="chapter-comment" className="sr-only">Bình luận của bạn</label>
                <input id="chapter-comment" type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Chia sẻ cảm nghĩ của bạn về chương này…"
                  className="input flex-1" />
                <button type="submit" disabled={!comment.trim() || commentSubmitting} className="btn btn-primary !px-4" aria-label="Gửi bình luận" title="Gửi bình luận">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <Link to="/login" className="flex items-center justify-center gap-2 mb-6 px-4 py-3.5 rounded-xl border border-dashed border-line text-sm text-ink-400 hover:border-primary-500/50 hover:text-primary-300 transition">
                <LogIn className="w-4 h-4" /> Đăng nhập để tham gia thảo luận
              </Link>
            )}

            {comments.length === 0 ? (
              <p className="text-center text-ink-500 py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            ) : (
              <ul className="space-y-2">
                {comments.map(c => (
                  <li
                    key={c.id}
                    id={`comment-${c.id}`}
                    className={`group flex gap-3 rounded-xl p-3 transition border scroll-mt-32 ${
                      c.pinned ? 'pinned-comment' : 'border-transparent hover:bg-ink-900/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-ink-900 flex items-center justify-center shrink-0 overflow-hidden">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-9 h-9 object-cover" /> : <User className="w-4 h-4 text-primary-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink-200">{c.username}</span>
                          {c.pinned && <span className="badge bg-amber-500/15 text-amber-400">Đã ghim</span>}
                          <span className="text-xs text-ink-500" title={formatDate(c.created_at)}>{timeAgo(c.created_at, 30)}</span>
                        </div>
                        {user?.is_admin && (
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => deleteComment(c.id)}
                              disabled={deletingCommentId === c.id}
                              className="btn-icon !w-8 !h-8 hover:!text-red-400 hover:!bg-red-500/10"
                              title="Xóa bình luận"
                              aria-label="Xóa bình luận"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => banUserFromComments(c.user_id, c.username)}
                              disabled={banningUserId === c.user_id}
                              className="btn-icon !w-8 !h-8 hover:!text-orange-400 hover:!bg-orange-500/10"
                              title="Cấm bình luận"
                              aria-label="Cấm người dùng bình luận"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-[15px] text-ink-300 mt-0.5 leading-relaxed break-words">{c.content}</p>
                      <div className="mt-2">
                        <CommentInteractions
                          commentId={c.id}
                          isStoryComment={false}
                          storyAuthorId={storyAuthorId || undefined}
                          isPinned={c.pinned || false}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Mobile bottom toolbar — within thumb reach, hides with the top bar */}
      <nav
        data-reader-chrome
        aria-label="Điều hướng chương"
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${
          toolbarHidden ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="grid grid-cols-4 h-14">
          {chapter.prev !== null ? (
            <Link to={`/story/${id}/chapter/${chapter.prev}`} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-400 active:text-primary-300">
              <ChevronLeft className="w-5 h-5" /> Trước
            </Link>
          ) : <span className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-700"><ChevronLeft className="w-5 h-5" /> Trước</span>}
          <button type="button" onClick={() => togglePanel('contents')} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${openPanel === 'contents' ? 'text-primary-300' : 'text-ink-400'}`}>
            <List className="w-5 h-5" /> Mục lục
          </button>
          <button type="button" onClick={() => togglePanel('settings')} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${openPanel === 'settings' ? 'text-primary-300' : 'text-ink-400'}`}>
            <Settings2 className="w-5 h-5" /> Cài đặt
          </button>
          {chapter.next !== null ? (
            <Link to={`/story/${id}/chapter/${chapter.next}`} className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-400 active:text-primary-300">
              <ChevronRight className="w-5 h-5" /> Sau
            </Link>
          ) : <span className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-ink-700"><ChevronRight className="w-5 h-5" /> Sau</span>}
        </div>
      </nav>

      {/* Focus mode controls */}
      {focusMode && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-1 rounded-full border border-line bg-elevated/90 backdrop-blur-xl px-1.5 py-1 shadow-[var(--rw-shadow-lg)] animate-reader-pop">
          {chapter.type === 'text' && <span className="px-2 text-xs text-ink-500 tabular-nums">{Math.round(progress * 100)}%</span>}
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="btn-icon !w-9 !h-9" title="Lên đầu trang" aria-label="Lên đầu trang">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setOpenPanel('settings')} className="btn-icon !w-9 !h-9" title="Cài đặt đọc" aria-label="Cài đặt đọc">
            <Settings2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setFocusMode(false)} className="btn btn-soft btn-sm !rounded-full" title="Thoát chế độ tập trung (Esc)">
            <Minimize2 className="w-4 h-4" /> Thoát
          </button>
        </div>
      )}

      {/* Resume where you left off */}
      {resumeAt !== null && (
        <div className="fixed bottom-20 md:bottom-5 left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md animate-reader-toast" role="status">
          <div className="flex items-center gap-3 rounded-2xl border border-primary-500/30 bg-elevated/95 backdrop-blur-xl px-4 py-3 shadow-[var(--rw-shadow-lg)]">
            <History className="w-5 h-5 text-primary-400 shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="text-ink-100 font-semibold">Đọc tiếp từ chỗ đã dừng?</div>
              <div className="text-xs text-ink-500">Bạn đã đọc được {Math.round(resumeAt * 100)}% chương này</div>
            </div>
            <button
              type="button"
              onClick={() => { scrollToProgress(articleRef.current, resumeAt); setResumeAt(null); }}
              className="btn btn-primary btn-sm shrink-0"
            >
              Đọc tiếp
            </button>
            <button type="button" onClick={() => setResumeAt(null)} className="btn-icon !w-8 !h-8 shrink-0" aria-label="Bỏ qua">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {openPanel === 'settings' && (
        <ReaderSettingsPanel
          prefs={prefs}
          onChange={updatePrefs}
          onReset={resetPrefs}
          onClose={() => setOpenPanel(null)}
          onFocusMode={focusMode ? undefined : () => { setOpenPanel(null); setFocusMode(true); }}
        />
      )}
      {openPanel === 'contents' && id && (
        <ChapterListDrawer
          storyId={id}
          storyTitle={chapter.story_title}
          chapters={storyChapters}
          currentNumber={chapter.chapter_number}
          readIds={readIds}
          showImageIcons={chapter.type !== 'comic'}
          onClose={() => setOpenPanel(null)}
        />
      )}
    </div>
  );
}
