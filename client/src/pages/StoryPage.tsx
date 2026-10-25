import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';
import { Star, Eye, BookOpen, Image, Clock, ArrowRight, User, Heart, MessageCircle, Share2, List, ChevronDown, ChevronUp, Shield, Plus, X, Edit, Search, Check, ArrowUpDown, FileText, Bookmark, GripVertical } from 'lucide-react';
import CommentInteractions from '../components/CommentInteractions';
import LatestComments from '../components/LatestComments';
import { ChapterImageIcon, PageLoader, Alert } from '../components/ui';
import { getCategoryBadge, genreLabel, statusLabel, typeLabel, apiErrorMessage } from '../lib/i18n';
import { formatDate, formatNumber, formatCompact, timeAgo, isRecent } from '../lib/format';
import { getProgress, getReadChapters, type StoredProgress } from '../lib/readingProgress';

interface Chapter { id: string; chapter_number: number; title: string; views: number; created_at: number; volume_id?: string; has_images?: boolean; }
interface Volume { id: string; volume_number: number; title: string; cover_url?: string; description?: string; chapter_count?: number; }
interface StoryDetail {
  id: string; title: string; description?: string; cover_url?: string;
  type: 'text' | 'comic'; genre?: string; tags?: string; status?: string;
  views: number; rating_avg: number; rating_count: number; user_rating: number;
  bookmark_count: number; comment_count: number; bookmarked: boolean;
  author_name: string; author_avatar?: string; author_id: string; author_is_admin?: number;
  work_author_name?: string; illustrator_name?: string; translator_name?: string;
  chapter_count: number; chapters: Chapter[]; created_at: number; updated_at: number;
  total_word_count?: number; additional_notes?: string;
}

function StarRating({ rating, onRate, interactive = false, size = 'md' }: { rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0);
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" disabled={!interactive} aria-label={`${star} sao`}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110 p-1' : 'cursor-default'} transition-transform`}>
          <Star className={`${cls} ${(hover || rating) >= star ? 'text-amber-500 fill-amber-500' : 'text-ink-700'}`} />
        </button>
      ))}
    </div>
  );
}

type ChapterFilter = 'all' | 'unread' | 'images';

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const volumesRef = useRef<HTMLDivElement | null>(null);
  const chaptersRef = useRef<HTMLDivElement | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [expandedVolumeDescriptions, setExpandedVolumeDescriptions] = useState<Set<string>>(new Set());
  const [expandedChapterLists, setExpandedChapterLists] = useState<Set<string>>(new Set());
  const [expandedChapterForms, setExpandedChapterForms] = useState<Set<string>>(new Set());
  const [userRating, setUserRating] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [volumeForm, setVolumeForm] = useState({ title: '', description: '' });
  const [volumeCover, setVolumeCover] = useState<File | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeError, setVolumeError] = useState('');
  const [volumeSuccess, setVolumeSuccess] = useState(false);
  
  // Edit volume state
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [editVolumeForm, setEditVolumeForm] = useState({ title: '', description: '' });
  const [editVolumeCover, setEditVolumeCover] = useState<File | null>(null);
  const [editVolumeCoverPreview, setEditVolumeCoverPreview] = useState<string>('');
  const [editVolumeLoading, setEditVolumeLoading] = useState(false);
  const [editVolumeError, setEditVolumeError] = useState('');
  const [editVolumeSuccess, setEditVolumeSuccess] = useState(false);
  
  // Per-volume chapter creation state
  const [chapterForms, setChapterForms] = useState<Record<string, { title: string; content: string; images: File[] }>>({});
  const [chapterPreviews, setChapterPreviews] = useState<Record<string, string[]>>({});
  const [chapterLoading, setChapterLoading] = useState<Record<string, boolean>>({});
  const [chapterErrors, setChapterErrors] = useState<Record<string, string>>({});
  const [chapterSuccess, setChapterSuccess] = useState<Record<string, boolean>>({});
  
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Latest comments state
  const [latestComments, setLatestComments] = useState<any[]>([]);

  // Additional notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  // Review state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // User ban state
  const [userCommentsBanned, setUserCommentsBanned] = useState(false);
  const [banningUserId, setBanningUserId] = useState<string | null>(null);

  // Drag-and-drop state
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [draggedOverChapterId, setDraggedOverChapterId] = useState<string | null>(null);
  const [reorderingLoading, setReorderingLoading] = useState(false);

  // Latest chapters state
  const [showLatestChapters, setShowLatestChapters] = useState(true);

  // Reading progress (persisted in localStorage by ChapterPage)
  const [readingProgress, setReadingProgress] = useState<StoredProgress | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Chapter list search / filter / order
  const [chapterQuery, setChapterQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<ChapterFilter>('all');
  const [newestFirst, setNewestFirst] = useState(false);

  useEffect(() => {
    if (!id) return;
    setReadingProgress(getProgress(id));
    setReadIds(getReadChapters(id));
  }, [id]);

  useEffect(() => {
    const loadStory = async () => {
      try {
        const [storyRes, volumesRes, commentsRes, reviewsRes, latestCommentsRes] = await Promise.all([
          api.get(`/stories/${id}`),
          api.get(`/stories/${id}/volumes`).catch(() => ({ data: { volumes: [] } })),
          api.get(`/stories/${id}/comments`).catch(() => ({ data: { comments: [] } })),
          api.get(`/stories/${id}/reviews`).catch(() => ({ data: { reviews: [] } })),
          api.get(`/stories/${id}/latest-comments`).catch(() => ({ data: { latestComments: [] } }))
        ]);
        setStory(storyRes.data);
        setNotesText(storyRes.data.additional_notes || '');
        setUserRating(storyRes.data.user_rating || 0);
        setBookmarked(storyRes.data.bookmarked || false);
        setBookmarkCount(storyRes.data.bookmark_count || 0);
        setVolumes(volumesRes.data.volumes || []);
        setComments(commentsRes.data.comments || []);
        setReviews(reviewsRes.data.reviews || []);
        setLatestComments(latestCommentsRes.data.latestComments || []);
        // Expand first volume by default
        if (volumesRes.data.volumes?.length > 0) {
          setExpandedVolumes(new Set([volumesRes.data.volumes[0].id]));
        }
      } catch (error) {
        console.error('Error loading story:', error);
      }
    };
    loadStory();
  }, [id]);

  // Scroll to and highlight a story comment linked as #comment-<id> (e.g. from Latest Comments)
  const hasComments = comments.length > 0;
  useEffect(() => {
    if (!hasComments) return;
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
  }, [hasComments]);

  const handleRate = async (rating: number) => {
    const r = await api.post(`/stories/${id}/rate`, { rating });
    setUserRating(r.data.user_rating);
    setStory(s => s ? { ...s, rating_avg: r.data.rating_avg, rating_count: r.data.rating_count } : s);
  };

  const toggleBookmark = async () => {
    const r = await api.post(`/stories/${id}/bookmark`);
    setBookmarked(r.data.bookmarked);
    setBookmarkCount(c => c + (r.data.bookmarked ? 1 : -1));
  };

  const saveNotes = async () => {
    setNotesLoading(true);
    setNotesError('');
    try {
      await api.patch(`/stories/${id}/notes`, { additional_notes: notesText });
      setStory(s => s ? { ...s, additional_notes: notesText } : s);
      setEditingNotes(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (error: any) {
      setNotesError(apiErrorMessage(error, 'Không thể lưu ghi chú'));
    } finally {
      setNotesLoading(false);
    }
  };

  const submitReview = async () => {
    if (reviewText.trim().length < 9) {
      setReviewError('Đánh giá phải dài hơn 8 ký tự');
      return;
    }

    setReviewLoading(true);
    setReviewError('');
    try {
      await api.post(`/stories/${id}/rate`, { rating: userRating || 1, review_text: reviewText });
      setReviewText('');
      setReviewSuccess(true);
      
      // Refresh reviews
      const reviewsRes = await api.get(`/stories/${id}/reviews`);
      setReviews(reviewsRes.data.reviews || []);
      
      setTimeout(() => setReviewSuccess(false), 2000);
    } catch (error: any) {
      setReviewError(apiErrorMessage(error, 'Không thể gửi đánh giá'));
    } finally {
      setReviewLoading(false);
    }
  };

  const deleteReview = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa đánh giá này?')) return;

    try {
      await api.delete(`/stories/${id}/ratings/${userId}`);
      
      // Refresh reviews and story data
      const [reviewsRes, storyRes] = await Promise.all([
        api.get(`/stories/${id}/reviews`),
        api.get(`/stories/${id}`)
      ]);
      setReviews(reviewsRes.data.reviews || []);
      setStory(storyRes.data);
      showToast('Đã xóa đánh giá', 'success');
    } catch (error: any) {
      console.error('Error deleting review:', error);
      showToast(apiErrorMessage(error, 'Không thể xóa đánh giá'), 'error');
    }
  };

  const createVolume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volumeForm.title.trim()) return;

    const formData = new FormData();
    formData.append('title', volumeForm.title);
    formData.append('description', volumeForm.description);
    formData.append('volume_number', String(volumes.length + 1));
    if (volumeCover) {
      formData.append('cover', volumeCover);
    }

    setVolumeLoading(true);
    setVolumeError('');
    try {
      await api.post(`/stories/${id}/volumes`, formData);
      setVolumeForm({ title: '', description: '' });
      setVolumeCover(null);
      setShowVolumeForm(false);
      setVolumeSuccess(true);
      // Refresh volumes
      const res = await api.get(`/stories/${id}/volumes`);
      const newVolumes = res.data.volumes || [];
      setVolumes(newVolumes);
      
      // Auto-expand newly created volume (last one in the list)
      if (newVolumes.length > 0) {
        const newVolumeId = newVolumes[newVolumes.length - 1].id;
        setExpandedVolumes(new Set([newVolumeId]));
      }
      
      // Clear success message after 2 seconds
      setTimeout(() => setVolumeSuccess(false), 2000);
    } catch (error: any) {
      console.error('Volume creation error:', error.response?.data || error.message);
      setVolumeError(apiErrorMessage(error, 'Không thể tạo tập'));
    } finally {
      setVolumeLoading(false);
    }
  };

  const editVolume = async (volumeId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editVolumeForm.title.trim()) return;

    const formData = new FormData();
    formData.append('title', editVolumeForm.title);
    formData.append('description', editVolumeForm.description);
    if (editVolumeCover) {
      formData.append('cover', editVolumeCover);
    }

    setEditVolumeLoading(true);
    setEditVolumeError('');
    try {
      await api.put(`/stories/${id}/volumes/${volumeId}`, formData);
      setEditingVolumeId(null);
      setEditVolumeForm({ title: '', description: '' });
      setEditVolumeCover(null);
      setEditVolumeCoverPreview('');
      setEditVolumeSuccess(true);
      
      // Refresh volumes
      const res = await api.get(`/stories/${id}/volumes`);
      setVolumes(res.data.volumes || []);
      
      // Also refresh the story to get updated chapter data
      const storyRes = await api.get(`/stories/${id}`);
      setStory(storyRes.data);
      
      // Clear success message after 2 seconds
      setTimeout(() => setEditVolumeSuccess(false), 2000);
    } catch (error: any) {
      console.error('Volume edit error:', error.response?.data || error.message);
      setEditVolumeError(apiErrorMessage(error, 'Không thể cập nhật tập'));
    } finally {
      setEditVolumeLoading(false);
    }
  };

  const initializeEditVolumeForm = (vol: Volume) => {
    setEditingVolumeId(vol.id);
    setEditVolumeForm({ title: vol.title || '', description: vol.description || '' });
    setEditVolumeCover(null);
    setEditVolumeCoverPreview(vol.cover_url || '');
    setEditVolumeError('');
  };

  const handleEditVolumeCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditVolumeCover(file);
      const preview = URL.createObjectURL(file);
      setEditVolumeCoverPreview(preview);
    }
  };

  const initializeChapterForm = (volumeId: string) => {
    if (!chapterForms[volumeId]) {
      setChapterForms(prev => ({ ...prev, [volumeId]: { title: '', content: '', images: [] } }));
      setChapterPreviews(prev => ({ ...prev, [volumeId]: [] }));
      setChapterLoading(prev => ({ ...prev, [volumeId]: false }));
      setChapterErrors(prev => ({ ...prev, [volumeId]: '' }));
    }
  };

  const handleChapterImages = (volumeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setChapterForms(prev => ({
      ...prev,
      [volumeId]: { ...prev[volumeId], images: [...(prev[volumeId]?.images || []), ...files] }
    }));
    const previews = files.map(f => URL.createObjectURL(f));
    setChapterPreviews(prev => ({
      ...prev,
      [volumeId]: [...(prev[volumeId] || []), ...previews]
    }));
  };

  const removeChapterImage = (volumeId: string, idx: number) => {
    setChapterForms(prev => ({
      ...prev,
      [volumeId]: { ...prev[volumeId], images: prev[volumeId].images.filter((_, i) => i !== idx) }
    }));
    setChapterPreviews(prev => ({
      ...prev,
      [volumeId]: prev[volumeId].filter((_, i) => i !== idx)
    }));
  };

  const insertTextAtCursor = (volumeId: string, text: string) => {
    const textarea = textareaRefs.current[volumeId];
    if (!textarea) {
      // Fallback: append to end if textarea not found
      setChapterForms(prev => ({
        ...prev,
        [volumeId]: { ...prev[volumeId], content: prev[volumeId].content + text }
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = chapterForms[volumeId]?.content || '';
    const before = currentContent.substring(0, start);
    const after = currentContent.substring(end);
    const newContent = before + text + after;
    
    setChapterForms(prev => ({
      ...prev,
      [volumeId]: { ...prev[volumeId], content: newContent }
    }));
    
    // Restore focus and set cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const createChapter = async (volumeId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;

    const form = chapterForms[volumeId];
    if (!form || !form.title.trim()) return;

    if (story.type === 'text' && !form.content.trim()) {
      setChapterErrors(prev => ({ ...prev, [volumeId]: 'Chương truyện chữ cần có nội dung' }));
      return;
    }
    if (story.type === 'comic' && form.images.length === 0) {
      setChapterErrors(prev => ({ ...prev, [volumeId]: 'Chương truyện tranh cần ít nhất một hình ảnh' }));
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('volume_id', volumeId);
    if (story.type === 'text') {
      formData.append('content', form.content);
      // For text chapters, also upload any embedded images
      form.images.forEach(img => formData.append('text_images', img));
    } else {
      // For comic chapters, images are the main content
      form.images.forEach(img => formData.append('images', img));
    }

    setChapterLoading(prev => ({ ...prev, [volumeId]: true }));
    setChapterErrors(prev => ({ ...prev, [volumeId]: '' }));
    try {
      await api.post(`/stories/${id}/chapters`, formData);
      
      // Reset form
      setChapterForms(prev => ({ ...prev, [volumeId]: { title: '', content: '', images: [] } }));
      setChapterPreviews(prev => ({ ...prev, [volumeId]: [] }));
      setExpandedChapterForms(prev => {
        const newSet = new Set(prev);
        newSet.delete(volumeId);
        return newSet;
      });
      
      setChapterSuccess(prev => ({ ...prev, [volumeId]: true }));
      setTimeout(() => setChapterSuccess(prev => ({ ...prev, [volumeId]: false })), 2000);
      
      // Refresh story chapters
      const res = await api.get(`/stories/${id}`);
      setStory(res.data);
    } catch (error: any) {
      console.error('Chapter creation error:', error.response?.data || error.message);
      setChapterErrors(prev => ({ ...prev, [volumeId]: apiErrorMessage(error, 'Không thể tạo chương') }));
    } finally {
      setChapterLoading(prev => ({ ...prev, [volumeId]: false }));
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      showToast('Đã sao chép liên kết truyện', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép liên kết', 'error');
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setCommentLoading(true);
    setCommentError('');
    try {
      const res = await api.post(`/stories/${id}/comments`, { content: newComment });
      setComments([res.data, ...comments]);
      setNewComment('');
    } catch (error: any) {
      const rawMsg: string = error.response?.data?.error || '';
      setCommentError(apiErrorMessage(error, 'Không thể đăng bình luận'));
      if (rawMsg.includes('banned')) {
        setUserCommentsBanned(true);
      }
    } finally {
      setCommentLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    
    try {
      await api.delete(`/stories/${id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      showToast('Đã xóa bình luận', 'success');
    } catch (error: any) {
      showToast(apiErrorMessage(error, 'Không thể xóa bình luận'), 'error');
    }
  };

  const banUserFromComments = async (userId: string, username: string) => {
    if (!window.confirm(`Cấm ${username} bình luận và đánh giá? Thao tác này không thể hoàn tác.`)) return;
    
    setBanningUserId(userId);
    try {
      await api.post(`/users/${userId}/ban-from-comments`, {});
      showToast(`Đã cấm ${username} bình luận và đánh giá`, 'success');
    } catch (error: any) {
      showToast(apiErrorMessage(error, 'Không thể cấm người dùng'), 'error');
    } finally {
      setBanningUserId(null);
    }
  };

  // Drag-and-drop handlers for chapter reordering
  const handleChapterDragStart = (e: React.DragEvent, chapterId: string) => {
    e.stopPropagation();
    setDraggedChapterId(chapterId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', chapterId);
    console.log('[Drag] Started dragging chapter:', chapterId);
  };

  const handleChapterDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleChapterDragEnter = (e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedChapterId && draggedChapterId !== chapterId) {
      setDraggedOverChapterId(chapterId);
    }
  };

  const handleChapterDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverChapterId(null);
  };

  const handleChapterDrop = async (e: React.DragEvent, targetChapterId: string, volumeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedOverChapterId(null);
    setDraggedChapterId(null);

    if (!draggedChapterId || draggedChapterId === targetChapterId || !user?.is_admin || !story) {
      return;
    }

    try {
      setReorderingLoading(true);
      console.log('[Drag Drop] Reordering chapters', { draggedChapterId, targetChapterId, volumeId });

      // Get fresh chapters array from current story state
      const allChapters = story.chapters;
      
      // Filter to get chapters in this volume, sorted by chapter_number
      const volChapters = allChapters
        .filter(ch => ch.volume_id === volumeId)
        .sort((a, b) => a.chapter_number - b.chapter_number);
      
      console.log('[Drag Drop] Volume chapters:', volChapters.map(c => ({ id: c.id, num: c.chapter_number, title: c.title })));

      const draggedIndex = volChapters.findIndex(ch => ch.id === draggedChapterId);
      const targetIndex = volChapters.findIndex(ch => ch.id === targetChapterId);

      console.log('[Drag Drop] Indices', { draggedIndex, targetIndex });

      if (draggedIndex === -1 || targetIndex === -1) {
        console.error('[Drag Drop] Chapter not found in volume', { draggedIndex, targetIndex });
        return;
      }

      // Reorder array: remove dragged item and insert before target
      const reordered = [...volChapters];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      console.log('[Drag Drop] New order:', reordered.map(c => ({ id: c.id, num: c.chapter_number })));

      // Send reorder request to backend with volumeId
      const result = await api.patch(`/stories/${id}/chapters/reorder`, {
        chapterIds: reordered.map((ch) => ch.id),
        volumeId: volumeId
      });

      console.log('[Drag Drop] API Response:', result.data);

      // Update local state with fresh data from backend
      if (result.data.chapters && Array.isArray(result.data.chapters)) {
        const updatedChapters = result.data.chapters as Array<{ id: string; chapter_number: number; volume_id?: string }>;
        
        // Map updated chapter numbers back to story chapters
        const newChapters = allChapters.map((ch) => {
          const updatedCh = updatedChapters.find((u) => u.id === ch.id);
          if (updatedCh) {
            return { ...ch, chapter_number: updatedCh.chapter_number };
          }
          return ch;
        });

        // Sort by chapter_number for display
        newChapters.sort((a, b) => a.chapter_number - b.chapter_number);

        console.log('[Drag Drop] Updated chapters:', newChapters.map(c => ({ id: c.id, num: c.chapter_number })));

        // Update story state
        setStory({
          ...story,
          chapters: newChapters
        });

        // Force UI refresh
        setExpandedChapterLists(new Set(expandedChapterLists));
      } else {
        console.error('[Drag Drop] No chapters in response:', result.data);
      }
    } catch (error) {
      console.error('[Drag Drop] Error reordering chapters:', error);
      showToast(apiErrorMessage(error, 'Không thể sắp xếp lại chương'), 'error');
    } finally {
      setReorderingLoading(false);
    }
  };

  if (!story) return <PageLoader label="Đang tải truyện…" />;

  const genres = story.genre?.split(',').map(g => g.trim()).filter(Boolean) ?? [];
  const descTruncated = story.description && story.description.length > 400 && !showFullDesc;
  const categoryBadge = getCategoryBadge(story.tags);
  const isAuthor = !!user && story.author_id === user.id;
  const canManageChapters = !!user?.is_admin && isAuthor;
  const firstChapter = story.chapters[0];
  const readCount = story.chapters.filter(ch => readIds.has(ch.id)).length;
  const readPct = story.chapters.length ? Math.round((readCount / story.chapters.length) * 100) : 0;
  const lastUpdated = story.chapters.length > 0 ? Math.max(...story.chapters.map(ch => ch.created_at)) : undefined;
  const isFiltering = chapterQuery.trim() !== '' || chapterFilter !== 'all';
  const canReorder = !!user?.is_admin && !isFiltering && !newestFirst;
  const showImageIcons = story.type !== 'comic'; // every comic chapter is image-based

  const matchesFilter = (ch: Chapter) => {
    const q = chapterQuery.trim().toLowerCase();
    if (q && !(ch.title || '').toLowerCase().includes(q) && String(ch.chapter_number) !== q) return false;
    if (chapterFilter === 'unread' && readIds.has(ch.id)) return false;
    if (chapterFilter === 'images' && !ch.has_images) return false;
    return true;
  };
  const ordered = <T,>(list: T[]) => (newestFirst ? [...list].reverse() : list);
  const hasIllustratedChapters = showImageIcons && story.chapters.some(ch => ch.has_images);

  const statusStyle = story.status === 'completed'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
    : story.status === 'hiatus'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
      : 'bg-primary-500/10 text-primary-300 border-primary-500/25';

  const renderChapterRow = (ch: Chapter, volumeId?: string) => {
    const isNew = isRecent(ch.created_at);
    const isRead = readIds.has(ch.id);
    const isCurrent = readingProgress?.chapterId
      ? readingProgress.chapterId === ch.id
      : readingProgress?.chapterNumber === ch.chapter_number;
    const isDragging = draggedChapterId === ch.id;
    const isDraggedOver = draggedOverChapterId === ch.id;
    const draggable = canReorder && !!volumeId;

    const row = (
      <Link
        to={`/story/${story.id}/chapter/${ch.chapter_number}`}
        onClick={(e) => reorderingLoading && e.preventDefault()}
        className="flex items-center gap-3 w-full min-h-12 px-4 sm:px-6 py-2.5"
        aria-label={`${ch.title}${ch.has_images && showImageIcons ? ' (có hình minh họa)' : ''}${isRead ? ' — đã đọc' : ''}`}
      >
        {draggable && <GripVertical className="w-4 h-4 text-ink-600 shrink-0 -ml-1 hidden sm:block" aria-hidden="true" />}
        {showImageIcons && ch.has_images ? <ChapterImageIcon /> : showImageIcons && hasIllustratedChapters ? <span className="w-[1.375rem] shrink-0" aria-hidden="true" /> : null}
        <span className={`flex-1 min-w-0 truncate font-medium transition ${
          isCurrent ? 'text-primary-300' : isRead ? 'text-ink-500' : 'text-ink-200 group-hover:text-primary-300'
        }`}>
          {ch.title}
        </span>
        {isCurrent && <span className="badge bg-primary-500/12 text-primary-300 shrink-0"><Bookmark className="w-3 h-3" /> Đang đọc</span>}
        {isNew && !isCurrent && <span className="badge bg-rose-500/12 text-rose-500 shrink-0">Mới</span>}
        {isRead && !isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />}
        <span className="hidden sm:flex items-center gap-1 text-xs text-ink-500 shrink-0 w-16 justify-end tabular-nums" title="Lượt xem">
          <Eye className="w-3.5 h-3.5" />{formatCompact(ch.views)}
        </span>
        <span className="text-xs text-ink-500 shrink-0 w-[4.75rem] text-right tabular-nums">{formatDate(ch.created_at)}</span>
      </Link>
    );

    if (!draggable) {
      return (
        <li key={ch.id} className={`group transition ${isCurrent ? 'bg-primary-500/[0.06]' : 'hover:bg-ink-900/70'}`}>
          {row}
        </li>
      );
    }
    return (
      <li
        key={ch.id}
        draggable
        onDragStart={(e) => handleChapterDragStart(e, ch.id)}
        onDragOver={handleChapterDragOver}
        onDragEnter={(e) => handleChapterDragEnter(e, ch.id)}
        onDragLeave={handleChapterDragLeave}
        onDrop={(e) => handleChapterDrop(e, ch.id, volumeId)}
        className={`group transition cursor-move ${
          isDragging ? 'opacity-50 bg-primary-500/10' :
          isDraggedOver ? 'bg-primary-500/15 shadow-[inset_0_2px_0_var(--primary-500)]' :
          isCurrent ? 'bg-primary-500/[0.06]' : 'hover:bg-ink-900/70'
        }`}
      >
        {row}
      </li>
    );
  };

  const jumpBtn = 'px-3.5 h-9 inline-flex items-center text-sm font-medium text-ink-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition whitespace-nowrap';
  const filterOptions: Array<{ value: ChapterFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'unread', label: 'Chưa đọc' },
    ...(hasIllustratedChapters ? [{ value: 'images' as ChapterFilter, label: 'Có minh họa' }] : []),
  ];

  return (
    <div>
      {/* Hero banner with blurred cover background */}
      <div className="relative overflow-hidden border-b border-line">
        {story.cover_url && (
          <div className="absolute inset-0" aria-hidden="true">
            <img src={story.cover_url} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-25 dark:opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-canvas/40 via-canvas/80 to-canvas" />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-8">
          <nav className="text-xs text-ink-500 mb-5 flex items-center gap-1.5" aria-label="Đường dẫn">
            <Link to="/" className="hover:text-primary-300">Trang chủ</Link>
            <span aria-hidden="true">/</span>
            <Link to="/browse" className="hover:text-primary-300">Truyện</Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink-400 truncate">{story.title}</span>
          </nav>
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            {/* Cover */}
            <div className="shrink-0 self-center md:self-start">
              <div className="w-48 md:w-60 aspect-[3/4] rounded-2xl overflow-hidden border border-line shadow-[var(--rw-shadow-lg)] relative bg-ink-900">
                {story.cover_url ? (
                  <img src={story.cover_url} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {story.type === 'comic' ? <Image className="w-16 h-16 text-ink-600" /> : <BookOpen className="w-16 h-16 text-ink-600" />}
                  </div>
                )}
                <span className={`badge absolute top-3 left-3 shadow-sm ${categoryBadge ? categoryBadge.badgeColor : story.type === 'comic' ? 'bg-orange-500 text-white' : 'bg-sky-500 text-white'}`}>
                  {categoryBadge ? categoryBadge.label : typeLabel(story.type)}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {genres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {genres.map(g => (
                    <Link key={g} to={`/browse?genre=${encodeURIComponent(g)}`} className="px-2.5 py-1 bg-primary-500/10 text-primary-300 text-xs font-semibold rounded-lg hover:bg-primary-500/20 transition">
                      {genreLabel(g)}
                    </Link>
                  ))}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl font-extrabold text-ink-50 mb-5 tracking-tight leading-tight">{story.title}</h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-5">
                {/* Translator (story creator) */}
                <Link to={`/user/${story.author_name}`} className="inline-flex items-center gap-2.5 group">
                  {story.author_avatar ? (
                    <img src={story.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary-500/25" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center ring-2 ring-line"><User className="w-4 h-4 text-primary-400" /></div>
                  )}
                  <div>
                    <span className="flex items-center gap-1 text-[11px] text-ink-500 font-semibold uppercase tracking-wider"><Shield className="w-3 h-3" />Dịch giả</span>
                    <span className={`text-sm font-semibold transition ${story.author_is_admin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500' : 'text-ink-200 group-hover:text-primary-300'}`}>
                      {story.author_name}
                      {story.author_is_admin && <span className="inline-block ml-0.5" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}>✨</span>}
                    </span>
                  </div>
                </Link>
                {story.work_author_name && (
                  <div className="text-sm">
                    <div className="text-[11px] text-ink-500 uppercase tracking-wider font-semibold">Tác giả</div>
                    <div className="text-ink-200 font-medium">{story.work_author_name}</div>
                  </div>
                )}
                {story.illustrator_name && (
                  <div className="text-sm">
                    <div className="text-[11px] text-ink-500 uppercase tracking-wider font-semibold">Họa sĩ minh họa</div>
                    <div className="text-ink-200 font-medium">{story.illustrator_name}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                {story.status && (
                  <span className={`px-2.5 py-1 rounded-lg font-semibold border ${statusStyle}`}>
                    {story.status === 'ongoing' ? '● ' : story.status === 'completed' ? '✓ ' : '⏸ '}{statusLabel(story.status)}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg font-semibold border border-line text-ink-400">{typeLabel(story.type)}</span>
                <span className="px-2.5 py-1 rounded-lg font-semibold border border-line text-ink-400">{formatNumber(story.chapter_count)} chương</span>
                {lastUpdated && (
                  <span className="px-2.5 py-1 rounded-lg border border-line text-ink-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Cập nhật {timeAgo(lastUpdated, 30)}</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {readingProgress && story.chapters.length > 0 ? (
                  <Link
                    to={`/story/${story.id}/chapter/${readingProgress.chapterNumber}`}
                    className="btn btn-primary btn-lg"
                    title={readingProgress.title ? `Lần cuối đọc: ${readingProgress.title}` : undefined}
                  >
                    <ArrowRight className="w-5 h-5" />
                    Đọc tiếp chương {readingProgress.chapterNumber}
                  </Link>
                ) : firstChapter && (
                  <Link to={`/story/${story.id}/chapter/${firstChapter.chapter_number}`} className="btn btn-primary btn-lg">
                    <BookOpen className="w-5 h-5" /> Bắt đầu đọc
                  </Link>
                )}
                {readingProgress && firstChapter && (
                  <Link to={`/story/${story.id}/chapter/${firstChapter.chapter_number}`} className="btn btn-secondary btn-lg">
                    Đọc từ đầu
                  </Link>
                )}
                {user && (
                  <button type="button" onClick={toggleBookmark} aria-pressed={bookmarked} className={`btn btn-lg border ${bookmarked ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/15' : 'btn-secondary'}`}>
                    <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} /> {bookmarked ? 'Đã lưu' : 'Lưu truyện'}
                  </button>
                )}
                <button type="button" onClick={handleShare} className="btn btn-secondary btn-lg" title="Sao chép liên kết">
                  <Share2 className="w-4 h-4" /> {copied ? 'Đã sao chép!' : 'Chia sẻ'}
                </button>
                {user?.is_admin && (
                  <Link to={`/story/${story.id}/edit`} className="btn btn-ghost btn-lg">
                    <Edit className="w-4 h-4" /> Sửa truyện
                  </Link>
                )}
              </div>

              {/* Personal progress */}
              {story.chapters.length > 0 && readCount > 0 && (
                <div className="mt-5 max-w-md">
                  <div className="flex justify-between text-xs text-ink-500 mb-1.5">
                    <span>Bạn đã đọc {readCount}/{story.chapters.length} chương</span>
                    <span className="tabular-nums">{readPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-ink-900 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500" style={{ width: `${readPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-line bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <dl className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-line">
            {[
              { icon: <Heart className="w-4 h-4 text-rose-500" />, value: formatNumber(bookmarkCount), label: 'Yêu thích' },
              { icon: <Star className="w-4 h-4 text-amber-500 fill-amber-500" />, value: story.rating_avg ? story.rating_avg.toFixed(2) : '—', extra: `/ ${story.rating_count}`, label: 'Đánh giá' },
              { icon: <Eye className="w-4 h-4 text-primary-400" />, value: formatCompact(story.views), label: 'Lượt xem' },
              { icon: <MessageCircle className="w-4 h-4 text-emerald-400" />, value: formatNumber(story.comment_count), label: 'Bình luận', hideMobile: true },
              { icon: <FileText className="w-4 h-4 text-indigo-400" />, value: formatCompact(story.total_word_count || 0), label: 'Số chữ', hideMobile: true },
            ].map(stat => (
              <div key={stat.label} className={`flex flex-col items-center py-4 gap-0.5 ${stat.hideMobile ? 'hidden sm:flex' : ''}`}>
                <dd className="flex items-center gap-1.5">
                  {stat.icon}
                  <span className="text-lg font-bold text-ink-100 font-display tabular-nums">{stat.value}</span>
                  {stat.extra && <span className="text-xs text-ink-500">{stat.extra}</span>}
                </dd>
                <dt className="text-[11px] text-ink-500 uppercase tracking-wider font-medium">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Sticky jump navigation */}
      {(volumes.length > 0 || story.chapters.length > 0 || comments.length > 0 || reviews.length > 0) && (
        <div className="sticky top-16 z-40 bg-surface/90 border-b border-line backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <nav className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar" aria-label="Chuyển nhanh">
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider whitespace-nowrap mr-2">Đi tới:</span>
              {(volumes.length > 0 || story.chapters.length > 0) && (
                <button type="button" onClick={() => volumesRef.current?.scrollIntoView({ behavior: 'smooth' })} className={jumpBtn}>
                  {volumes.length > 0 ? 'Danh sách tập' : 'Danh sách chương'}
                </button>
              )}
              {story.description && (
                <button type="button" onClick={() => chaptersRef.current?.scrollIntoView({ behavior: 'smooth' })} className={jumpBtn}>
                  Giới thiệu
                </button>
              )}
              {reviews.length > 0 && (
                <button type="button" onClick={() => reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })} className={jumpBtn}>
                  Đánh giá ({reviews.length})
                </button>
              )}
              <button type="button" onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth' })} className={jumpBtn}>
                Bình luận ({comments.length})
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main content — two-column layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: synopsis */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Synopsis */}
            {story.description && (
              <section ref={chaptersRef} className="card p-6 scroll-mt-32">
                <h2 className="section-title text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-400" /> Giới thiệu
                </h2>
                <p className={`text-ink-300 leading-relaxed whitespace-pre-wrap text-[15px] ${descTruncated ? 'line-clamp-6' : ''}`}>
                  {story.description}
                </p>
                {story.description.length > 400 && (
                  <button type="button" onClick={() => setShowFullDesc(!showFullDesc)} className="btn btn-ghost btn-sm mt-2 -ml-2">
                    {showFullDesc ? <><ChevronUp className="w-4 h-4" /> Thu gọn</> : <><ChevronDown className="w-4 h-4" /> Xem thêm</>}
                  </button>
                )}
              </section>
            )}

            {/* Latest Chapters Preview */}
            {story.chapters.length > 0 && (
              <section className="card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLatestChapters(!showLatestChapters)}
                  aria-expanded={showLatestChapters}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-ink-900/60 transition group"
                >
                  <h2 className="section-title text-lg flex items-center gap-2 group-hover:text-primary-300 transition">
                    <Clock className="w-5 h-5 text-primary-400" /> Chương mới nhất
                  </h2>
                  {showLatestChapters ? <ChevronUp className="w-5 h-5 text-ink-500" /> : <ChevronDown className="w-5 h-5 text-ink-500" />}
                </button>
                {showLatestChapters && (
                  <ul className="divide-y divide-line border-t border-line">
                    {[...story.chapters].sort((a, b) => b.created_at - a.created_at || b.chapter_number - a.chapter_number).slice(0, 5).map((chapter) => {
                      const volume = volumes.find(v => v.id === chapter.volume_id);
                      return (
                        <li key={chapter.id}>
                          <Link
                            to={`/story/${story.id}/chapter/${chapter.chapter_number}`}
                            className="flex items-center gap-4 px-6 py-3 hover:bg-ink-900/60 transition group"
                          >
                            {volume?.cover_url && (
                              <img src={volume.cover_url} alt="" className="w-10 h-14 rounded-md object-cover border border-line shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              {volume && (
                                <span className="block text-[11px] font-semibold text-ink-500 uppercase tracking-wider truncate">
                                  {volume.title || `Tập ${volume.volume_number}`}
                                </span>
                              )}
                              <span className="flex items-center gap-2 font-medium text-ink-200 group-hover:text-primary-300 transition">
                                {showImageIcons && chapter.has_images && <ChapterImageIcon />}
                                <span className="truncate">{chapter.title}</span>
                                {isRecent(chapter.created_at) && <span className="badge bg-rose-500/12 text-rose-500 shrink-0">Mới</span>}
                              </span>
                              <span className="flex items-center gap-3 mt-0.5 text-xs text-ink-500">
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {formatNumber(chapter.views)}</span>
                                <span>{timeAgo(chapter.created_at, 30)}</span>
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-ink-600 group-hover:text-primary-400 transition shrink-0" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {/* Rate this series */}
            {user && (
              <section className="card p-6" style={{ opacity: userCommentsBanned ? 0.6 : 1 }}>
                {userCommentsBanned && (
                  <Alert kind="error" className="mb-4">Bạn đã bị cấm bình luận và đánh giá</Alert>
                )}
                <h2 className="section-title text-lg mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" /> Đánh giá truyện
                </h2>

                <div className="space-y-4">
                  <div>
                    <span className="label">Điểm của bạn</span>
                    <div className="flex items-center gap-3">
                      <StarRating rating={userRating} onRate={userCommentsBanned ? undefined : handleRate} interactive={!userCommentsBanned} />
                      {userRating > 0 && <span className="text-sm text-amber-400 font-bold">{userRating}/5</span>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-text" className="label">Nhận xét (không bắt buộc)</label>
                    {reviewSuccess && !userCommentsBanned && <Alert kind="success" className="mb-3">✓ Đã gửi đánh giá thành công!</Alert>}
                    {reviewError && !userCommentsBanned && <Alert kind="error" className="mb-3">{reviewError}</Alert>}
                    <textarea
                      id="review-text"
                      value={reviewText}
                      onChange={(e) => {
                        setReviewText(e.target.value);
                        setReviewError('');
                      }}
                      placeholder={userCommentsBanned ? 'Bạn đã bị cấm đánh giá' : 'Chia sẻ cảm nhận của bạn về bộ truyện (tối thiểu 9 ký tự)…'}
                      disabled={reviewLoading || userCommentsBanned}
                      className="input resize-none h-24"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className={`text-xs ${reviewText.trim().length < 9 ? 'text-ink-500' : 'text-emerald-400'}`}>
                        {reviewText.trim().length}/9 ký tự
                      </span>
                      <button
                        type="button"
                        onClick={submitReview}
                        disabled={reviewLoading || userRating === 0 || userCommentsBanned || reviewText.trim().length < 9}
                        className="btn btn-primary btn-sm"
                        title={userRating === 0 ? 'Hãy chọn số sao trước' : undefined}
                      >
                        {reviewLoading ? 'Đang gửi…' : 'Gửi đánh giá'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* User Reviews */}
            {reviews.length > 0 && (
              <section ref={reviewsRef} className="card p-6 scroll-mt-32">
                <h2 className="section-title text-lg mb-4">Đánh giá của độc giả ({reviews.length})</h2>
                <ul className="space-y-4">
                  {reviews.map((review, idx) => (
                    <li key={idx} className="flex gap-3 pb-4 border-b border-line last:border-b-0 last:pb-0">
                      {review.avatar_url ? (
                        <img src={review.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-ink-900 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink-200">{review.username}</span>
                          <span className="flex items-center gap-0.5" aria-label={`${review.rating} trên 5 sao`}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-ink-700'}`} />
                            ))}
                          </span>
                          <span className="text-xs text-ink-500">{timeAgo(review.created_at)}</span>
                          {user?.is_admin && (
                            <div className="ml-auto flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => deleteReview(review.user_id)}
                                className="btn-icon !w-8 !h-8 hover:!text-red-400 hover:!bg-red-500/10"
                                title="Xóa đánh giá"
                                aria-label="Xóa đánh giá"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => banUserFromComments(review.user_id, review.username)}
                                disabled={banningUserId === review.user_id}
                                className="btn btn-sm text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                title="Cấm người dùng bình luận"
                              >
                                {banningUserId === review.user_id ? 'Đang cấm…' : 'Cấm'}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-ink-300 leading-relaxed mt-1 break-words">{review.review_text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-6">
            {/* Additional Notes */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-ink-200 font-display">Ghi chú thêm</h2>
                {user && (user.is_admin || story.author_id === user.id) && !editingNotes && (
                  <button type="button" onClick={() => setEditingNotes(true)} className="btn btn-soft btn-sm">
                    <Edit className="w-3.5 h-3.5" /> Sửa
                  </button>
                )}
              </div>

              {notesSaved && <Alert kind="success" className="mb-3">✓ Đã lưu ghi chú!</Alert>}
              {notesError && <Alert kind="error" className="mb-3">{notesError}</Alert>}

              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    disabled={notesLoading}
                    placeholder="Thêm ghi chú về bộ truyện…"
                    aria-label="Ghi chú thêm"
                    className="input resize-none h-28 text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesText(story.additional_notes || '');
                      }}
                      disabled={notesLoading}
                      className="btn btn-secondary btn-sm"
                    >
                      Hủy
                    </button>
                    <button type="button" onClick={saveNotes} disabled={notesLoading} className="btn btn-primary btn-sm">
                      {notesLoading ? 'Đang lưu…' : 'Lưu'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${notesText ? 'text-ink-300' : 'text-ink-500 italic'}`}>
                  {notesText || 'Chưa có ghi chú nào.'}
                </p>
              )}
            </section>

            {/* Latest Comments */}
            {id && (
              <LatestComments
                storyId={id}
                latestComments={latestComments}
                isLoading={false}
              />
            )}
          </aside>
        </div>
      </div>

      {/* Volume creation form for admins */}
      {canManageChapters && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          {volumeSuccess && <Alert kind="success" className="mb-4">✓ Đã tạo tập mới!</Alert>}
          {!showVolumeForm ? (
            <button type="button" onClick={() => setShowVolumeForm(true)} className="btn bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/15">
              <Plus className="w-4 h-4" /> Tạo tập mới
            </button>
          ) : (
            <div className="card p-6">
              <h3 className="section-title text-lg mb-4">Tạo tập mới</h3>
              {volumeError && <Alert kind="error" className="mb-4">{volumeError}</Alert>}
              <form onSubmit={createVolume} className="space-y-4">
                <div>
                  <label htmlFor="new-volume-title" className="label">Tên tập</label>
                  <input
                    id="new-volume-title"
                    type="text"
                    value={volumeForm.title}
                    onChange={(e) => setVolumeForm(v => ({ ...v, title: e.target.value }))}
                    placeholder="VD: Tập 1: Khởi đầu"
                    disabled={volumeLoading}
                    className="input"
                  />
                </div>
                <div>
                  <label htmlFor="new-volume-desc" className="label">Mô tả (không bắt buộc)</label>
                  <textarea
                    id="new-volume-desc"
                    value={volumeForm.description}
                    onChange={(e) => setVolumeForm(v => ({ ...v, description: e.target.value }))}
                    placeholder="Giới thiệu ngắn về tập này…"
                    disabled={volumeLoading}
                    className="input resize-none h-24"
                  />
                </div>
                <div>
                  <label htmlFor="new-volume-cover" className="label">Ảnh bìa (không bắt buộc)</label>
                  <input
                    id="new-volume-cover"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVolumeCover(e.target.files?.[0] || null)}
                    disabled={volumeLoading}
                    className="block w-full text-ink-400 text-sm file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-primary-500/10 file:text-primary-300 file:font-semibold hover:file:bg-primary-500/20 disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVolumeForm(false);
                      setVolumeForm({ title: '', description: '' });
                      setVolumeCover(null);
                      setVolumeError('');
                    }}
                    disabled={volumeLoading}
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={!volumeForm.title.trim() || volumeLoading} className="btn btn-primary">
                    {volumeLoading ? 'Đang tạo…' : 'Tạo tập'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Volumes and Chapters section */}
      <div ref={volumesRef} id="chapter-list" className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 scroll-mt-32">
        <section className="card overflow-hidden">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-line space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title text-xl flex items-center gap-2">
                  <List className="w-5 h-5 text-primary-400" /> {volumes.length > 0 ? 'Danh sách tập' : 'Danh sách chương'}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-500">
                  {volumes.length > 0 && <span>{volumes.length} tập</span>}
                  <span>{formatNumber(story.chapter_count)} chương</span>
                  {lastUpdated && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Cập nhật {timeAgo(lastUpdated, 30)}</span>}
                  {hasIllustratedChapters && <span className="flex items-center gap-1.5"><ChapterImageIcon className="!w-4 !h-4" /> = có hình minh họa</span>}
                </div>
              </div>
              {reorderingLoading && <span className="text-xs text-primary-300">Đang sắp xếp…</span>}
            </div>

            {story.chapters.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <label htmlFor="chapter-search" className="sr-only">Tìm chương</label>
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
                  <input
                    id="chapter-search"
                    type="search"
                    value={chapterQuery}
                    onChange={e => setChapterQuery(e.target.value)}
                    placeholder="Tìm theo tên hoặc số chương…"
                    className="input pl-10 !min-h-10 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <div className="flex gap-1.5" role="group" aria-label="Lọc chương">
                    {filterOptions.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setChapterFilter(opt.value)} aria-pressed={chapterFilter === opt.value} className="chip !min-h-10">
                        {opt.value === 'images' && <Image className="w-3.5 h-3.5" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewestFirst(v => !v)}
                    className="chip !min-h-10"
                    aria-pressed={newestFirst}
                    title="Đổi thứ tự sắp xếp"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" /> {newestFirst ? 'Mới nhất' : 'Cũ nhất'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {story.chapters.length === 0 && volumes.length === 0 ? (
            <p className="text-ink-500 text-center py-16">Chưa có chương nào được đăng. Hãy quay lại sau nhé!</p>
          ) : isFiltering && !story.chapters.some(matchesFilter) ? (
            <div className="text-center py-14 px-6">
              <p className="text-ink-400">Không có chương nào phù hợp.</p>
              <button type="button" onClick={() => { setChapterQuery(''); setChapterFilter('all'); }} className="btn btn-ghost btn-sm mt-3">Xóa bộ lọc</button>
            </div>
          ) : volumes.length > 0 ? (
            <div className="divide-y divide-line">
              {ordered(volumes).map((vol) => {
                const allVolChapters = story.chapters.filter(ch => ch.volume_id === vol.id);
                const volChapters = ordered(allVolChapters.filter(matchesFilter));
                if (isFiltering && volChapters.length === 0) return null;
                const isExpanded = isFiltering || expandedVolumes.has(vol.id);
                const showAll = isFiltering || expandedChapterLists.has(vol.id);
                const volRead = allVolChapters.filter(ch => readIds.has(ch.id)).length;
                const volIllustrated = showImageIcons && allVolChapters.some(ch => ch.has_images);
                return (
                  <div key={vol.id}>
                    {/* Volume header - cover image and title */}
                    <div className="flex items-center gap-2 px-4 sm:px-6 py-4 hover:bg-ink-900/50 transition group">
                      <button
                        type="button"
                        onClick={() => {
                          const newExpanded = new Set(expandedVolumes);
                          if (newExpanded.has(vol.id)) {
                            newExpanded.delete(vol.id);
                          } else {
                            newExpanded.add(vol.id);
                          }
                          setExpandedVolumes(newExpanded);
                        }}
                        aria-expanded={isExpanded}
                        className="flex-1 flex items-center gap-4 text-left min-w-0"
                      >
                        {vol.cover_url ? (
                          <img src={vol.cover_url} alt="" className="w-16 h-24 sm:w-24 sm:h-36 rounded-xl object-cover border border-line shrink-0 shadow-sm" />
                        ) : (
                          <div className="w-16 h-24 sm:w-24 sm:h-36 rounded-xl bg-ink-900 border border-line shrink-0 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-ink-600" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-primary-400 uppercase tracking-wider">Tập {vol.volume_number}</span>
                          <span className="text-base sm:text-lg font-bold text-ink-100 group-hover:text-primary-300 transition block font-display leading-snug">
                            {vol.title || `Tập ${vol.volume_number}`}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-ink-500">
                            <span>{allVolChapters.length} chương</span>
                            {volRead > 0 && <span className="flex items-center gap-1 text-emerald-400"><Check className="w-3.5 h-3.5" /> Đã đọc {volRead}/{allVolChapters.length}</span>}
                            {volIllustrated && <span className="flex items-center gap-1"><Image className="w-3.5 h-3.5 text-amber-500" /> Có minh họa</span>}
                          </span>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-ink-500 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Edit button - only show for story author */}
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => initializeEditVolumeForm(vol)}
                          className="btn-icon shrink-0"
                          title="Sửa tập"
                          aria-label="Sửa tập"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Expanded volume content */}
                    {isExpanded && (
                      <div className="bg-ink-950/60 border-t border-line">
                        {/* Collapsible Description Section */}
                        {vol.description && !isFiltering && (
                          <div className="border-b border-line">
                            <button
                              type="button"
                              onClick={() => {
                                const newExpanded = new Set(expandedVolumeDescriptions);
                                if (newExpanded.has(vol.id)) {
                                  newExpanded.delete(vol.id);
                                } else {
                                  newExpanded.add(vol.id);
                                }
                                setExpandedVolumeDescriptions(newExpanded);
                              }}
                              aria-expanded={expandedVolumeDescriptions.has(vol.id)}
                              className="w-full px-4 sm:px-6 py-3 flex items-center justify-between hover:bg-ink-900/60 transition group"
                            >
                              <span className="text-sm font-medium text-ink-400 group-hover:text-primary-300 transition">
                                Giới thiệu tập
                              </span>
                              <ChevronDown className={`w-4 h-4 text-ink-500 transition-transform ${expandedVolumeDescriptions.has(vol.id) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedVolumeDescriptions.has(vol.id) && (
                              <div className="px-4 sm:px-6 pb-4 text-ink-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {vol.description}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Edit volume form - shown when editing */}
                        {editingVolumeId === vol.id && (
                          <div className="p-6 space-y-4 bg-surface border-b border-line">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-ink-100">Sửa thông tin tập</h4>
                              <button type="button" onClick={() => setEditingVolumeId(null)} className="btn-icon" aria-label="Đóng">
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {editVolumeError && <Alert kind="error">{editVolumeError}</Alert>}
                            {editVolumeSuccess && <Alert kind="success">✓ Đã cập nhật tập!</Alert>}

                            <form onSubmit={(e) => editVolume(vol.id, e)} className="space-y-4">
                              <div>
                                <label htmlFor={`edit-vol-title-${vol.id}`} className="label">Tên tập</label>
                                <input
                                  id={`edit-vol-title-${vol.id}`}
                                  type="text"
                                  value={editVolumeForm.title}
                                  onChange={(e) => setEditVolumeForm(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="VD: Tập 1: Khởi đầu"
                                  disabled={editVolumeLoading}
                                  className="input"
                                />
                              </div>

                              <div>
                                <label htmlFor={`edit-vol-desc-${vol.id}`} className="label">Mô tả</label>
                                <textarea
                                  id={`edit-vol-desc-${vol.id}`}
                                  value={editVolumeForm.description}
                                  onChange={(e) => setEditVolumeForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Giới thiệu ngắn về tập này…"
                                  disabled={editVolumeLoading}
                                  rows={3}
                                  className="input resize-none"
                                />
                              </div>

                              <div>
                                <span className="label">Ảnh bìa</span>
                                {editVolumeCoverPreview && (
                                  <div className="mb-3 relative inline-block group/cover">
                                    <img src={editVolumeCoverPreview} alt="" className="w-24 h-32 rounded-lg object-cover border border-line" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditVolumeCover(null);
                                        setEditVolumeCoverPreview('');
                                      }}
                                      className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition"
                                      aria-label="Bỏ ảnh bìa đã chọn"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/50 transition">
                                  <Image className="w-7 h-7 text-ink-500 mb-1.5" />
                                  <span className="text-sm text-ink-400">Nhấn để đổi ảnh bìa</span>
                                  <input type="file" accept="image/*" onChange={handleEditVolumeCover} disabled={editVolumeLoading} className="hidden" />
                                </label>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => setEditingVolumeId(null)} disabled={editVolumeLoading} className="btn btn-secondary">
                                  Hủy
                                </button>
                                <button type="submit" disabled={!editVolumeForm.title.trim() || editVolumeLoading} className="btn btn-primary">
                                  {editVolumeLoading ? 'Đang lưu…' : 'Lưu thay đổi'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {/* Chapter list */}
                        {volChapters.length === 0 ? (
                          <p className="text-ink-500 text-center py-6 text-sm">Tập này chưa có chương nào</p>
                        ) : (
                          <>
                            <ul className="divide-y divide-line">
                              {volChapters.slice(0, showAll ? volChapters.length : 5).map(ch => renderChapterRow(ch, vol.id))}
                            </ul>
                            {!isFiltering && volChapters.length > 5 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newExpanded = new Set(expandedChapterLists);
                                  if (newExpanded.has(vol.id)) {
                                    newExpanded.delete(vol.id);
                                  } else {
                                    newExpanded.add(vol.id);
                                  }
                                  setExpandedChapterLists(newExpanded);
                                }}
                                className="w-full px-6 py-3 flex items-center justify-center gap-1.5 text-primary-300 hover:bg-primary-500/5 transition text-sm font-semibold border-t border-line"
                              >
                                {expandedChapterLists.has(vol.id)
                                  ? <><ChevronUp className="w-4 h-4" /> Thu gọn</>
                                  : <><ChevronDown className="w-4 h-4" /> Xem thêm {volChapters.length - 5} chương</>}
                              </button>
                            )}
                          </>
                        )}

                        {/* Chapter creation form for admins - shown below chapter list */}
                        {canManageChapters && !isFiltering && (
                          <div className="border-t border-line">
                            {!expandedChapterForms.has(vol.id) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  initializeChapterForm(vol.id);
                                  setExpandedChapterForms(prev => new Set([...prev, vol.id]));
                                }}
                                className="w-full px-6 py-3 flex items-center gap-2 text-primary-300 hover:bg-primary-500/5 transition text-sm font-semibold"
                              >
                                <Plus className="w-4 h-4" /> Thêm chương vào tập này
                              </button>
                            ) : (
                              <div className="p-6 space-y-4 bg-surface">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-bold text-ink-100">Thêm chương mới</h4>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedChapterForms(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(vol.id);
                                      return newSet;
                                    })}
                                    className="btn-icon"
                                    aria-label="Đóng"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {chapterSuccess[vol.id] && <Alert kind="success">✓ Đã tạo chương mới!</Alert>}
                                {chapterErrors[vol.id] && <Alert kind="error">{chapterErrors[vol.id]}</Alert>}

                                <form onSubmit={(e) => createChapter(vol.id, e)} className="space-y-4">
                                  <div>
                                    <label htmlFor={`new-ch-title-${vol.id}`} className="label">Tiêu đề chương</label>
                                    <input
                                      id={`new-ch-title-${vol.id}`}
                                      type="text"
                                      value={chapterForms[vol.id]?.title || ''}
                                      onChange={(e) => setChapterForms(prev => ({
                                        ...prev,
                                        [vol.id]: { ...prev[vol.id], title: e.target.value }
                                      }))}
                                      placeholder="Nhập tiêu đề chương (bắt buộc)"
                                      disabled={chapterLoading[vol.id]}
                                      className="input"
                                    />
                                  </div>

                                  {story.type === 'text' ? (
                                    <div className="space-y-4">
                                      <div>
                                        <label htmlFor={`new-ch-content-${vol.id}`} className="label">Nội dung</label>
                                        <textarea
                                          id={`new-ch-content-${vol.id}`}
                                          ref={(el) => { if (el) textareaRefs.current[vol.id] = el; }}
                                          value={chapterForms[vol.id]?.content || ''}
                                          onChange={(e) => setChapterForms(prev => ({
                                            ...prev,
                                            [vol.id]: { ...prev[vol.id], content: e.target.value }
                                          }))}
                                          placeholder="Viết nội dung chương tại đây… Bạn có thể chèn hình ảnh ở bên dưới."
                                          disabled={chapterLoading[vol.id]}
                                          rows={10}
                                          className="input resize-y font-mono text-sm leading-relaxed"
                                        />
                                      </div>

                                      <div>
                                        <span className="label">Chèn hình ảnh vào nội dung</span>
                                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/50 transition">
                                          <Image className="w-6 h-6 text-ink-500 mb-1" />
                                          <span className="text-sm text-ink-400">Nhấn để thêm hình ảnh</span>
                                          <span className="text-xs text-ink-500 mt-1">Hình ảnh sẽ được chèn vào nội dung chương</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleChapterImages(vol.id, e)}
                                            disabled={chapterLoading[vol.id]}
                                            className="hidden"
                                          />
                                        </label>

                                        {(chapterPreviews[vol.id] || []).length > 0 && (
                                          <div className="mt-3 space-y-2">
                                            <p className="text-xs text-ink-400">Nhấn vào một hình để chèn vào vị trí con trỏ:</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                              {chapterPreviews[vol.id].map((src, i) => (
                                                <div key={i} className="relative group">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      // Insert markdown image syntax into content at cursor position
                                                      const imageName = `image-${i + 1}`;
                                                      const markdownImage = `![${imageName}](${src})\n`;
                                                      insertTextAtCursor(vol.id, markdownImage);
                                                    }}
                                                    className="w-full text-left"
                                                  >
                                                    <img src={src} alt={`Hình ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line hover:border-primary-500 transition group-hover:opacity-75" />
                                                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition rounded-lg">
                                                      Nhấn để chèn
                                                    </span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => removeChapterImage(vol.id, i)}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                                                    aria-label={`Bỏ hình ${i + 1}`}
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="label">Tải lên các trang</span>
                                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/50 transition">
                                        <Image className="w-8 h-8 text-ink-500 mb-2" />
                                        <span className="text-sm text-ink-400">Nhấn để tải hình ảnh lên</span>
                                        <span className="text-xs text-ink-500 mt-1">PNG, JPG, WebP, tối đa 10MB mỗi ảnh</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          onChange={(e) => handleChapterImages(vol.id, e)}
                                          disabled={chapterLoading[vol.id]}
                                          className="hidden"
                                        />
                                      </label>

                                      {(chapterPreviews[vol.id] || []).length > 0 && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                                          {chapterPreviews[vol.id].map((src, i) => (
                                            <div key={i} className="relative group">
                                              <img src={src} alt={`Trang ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-line" />
                                              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{i + 1}</span>
                                              <button
                                                type="button"
                                                onClick={() => removeChapterImage(vol.id, i)}
                                                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                                                aria-label={`Bỏ trang ${i + 1}`}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex gap-2 justify-end pt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedChapterForms(prev => {
                                          const newSet = new Set(prev);
                                          newSet.delete(vol.id);
                                          return newSet;
                                        });
                                        setChapterForms(prev => ({ ...prev, [vol.id]: { title: '', content: '', images: [] } }));
                                        setChapterPreviews(prev => ({ ...prev, [vol.id]: [] }));
                                        setChapterErrors(prev => ({ ...prev, [vol.id]: '' }));
                                      }}
                                      disabled={chapterLoading[vol.id]}
                                      className="btn btn-secondary"
                                    >
                                      Hủy
                                    </button>
                                    <button type="submit" disabled={!chapterForms[vol.id]?.title.trim() || chapterLoading[vol.id]} className="btn btn-primary">
                                      {chapterLoading[vol.id] ? 'Đang đăng…' : 'Đăng chương'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {ordered(story.chapters.filter(matchesFilter)).map(ch => renderChapterRow(ch))}
            </ul>
          )}
        </section>
      </div>

      {/* Comments section */}
      <div ref={commentsRef} className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 scroll-mt-32">
        <section className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-line">
            <h2 className="section-title text-xl flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-400" /> Bình luận <span className="text-ink-500 font-medium text-base">({comments.length})</span>
            </h2>
          </div>

          <div className="p-6">
            {userCommentsBanned && (
              <Alert kind="error" className="mb-6">Bạn đã bị cấm bình luận và đánh giá</Alert>
            )}

            {/* Comment form */}
            {user ? (
              <form onSubmit={addComment} className="mb-8 space-y-3" style={{ opacity: userCommentsBanned ? 0.6 : 1 }}>
                {commentError && !userCommentsBanned && <Alert kind="error">{commentError}</Alert>}
                <label htmlFor="story-comment" className="sr-only">Bình luận của bạn</label>
                <textarea
                  id="story-comment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={userCommentsBanned ? 'Bạn đã bị cấm bình luận' : 'Chia sẻ cảm nghĩ của bạn về bộ truyện…'}
                  disabled={commentLoading || userCommentsBanned}
                  className="input resize-none h-24"
                />
                <div className="flex justify-end">
                  <button type="submit" disabled={!newComment.trim() || commentLoading || userCommentsBanned} className="btn btn-primary">
                    {commentLoading ? 'Đang gửi…' : 'Gửi bình luận'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-8 p-4 rounded-xl bg-ink-900/60 border border-dashed border-line text-ink-400 text-sm text-center">
                <Link to="/login" className="text-primary-300 hover:underline font-semibold">Đăng nhập</Link>
                {' '}để bình luận về bộ truyện này
              </div>
            )}

            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-ink-500 text-center py-8">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            ) : (
              <ul className="space-y-3">
                {comments.map(comment => (
                  <li
                    key={comment.id}
                    id={`comment-${comment.id}`}
                    className={`group rounded-xl p-3 sm:p-4 border transition scroll-mt-32 ${
                      comment.pinned ? 'pinned-comment' : 'border-transparent hover:bg-ink-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {comment.avatar_url ? (
                        <img src={comment.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-ink-900 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-ink-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${comment.is_admin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500' : 'text-ink-200'}`}>
                              {comment.username}
                              {comment.is_admin && <span className="inline-block ml-0.5" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}>✨</span>}
                            </span>
                            {comment.pinned && <span className="badge bg-amber-500/15 text-amber-400">Đã ghim</span>}
                            <span className="text-xs text-ink-500" title={formatDate(comment.created_at)}>
                              {timeAgo(comment.created_at, 30)}
                            </span>
                          </div>
                          {user?.is_admin && (
                            <div className="flex items-center gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => deleteComment(comment.id)}
                                className="btn-icon !w-8 !h-8 hover:!text-red-400 hover:!bg-red-500/10"
                                title="Xóa bình luận"
                                aria-label="Xóa bình luận"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => banUserFromComments(comment.user_id, comment.username)}
                                disabled={banningUserId === comment.user_id}
                                className="btn btn-sm text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                title="Cấm người dùng bình luận"
                              >
                                {banningUserId === comment.user_id ? 'Đang cấm…' : 'Cấm'}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-ink-300 text-[15px] leading-relaxed mt-1 break-words whitespace-pre-wrap">{comment.content}</p>
                        <div className="mt-2">
                          <CommentInteractions
                            commentId={comment.id}
                            isStoryComment={true}
                            storyAuthorId={story?.author_id}
                            isPinned={comment.pinned || false}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
