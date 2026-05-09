import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Star, Eye, BookOpen, Image, Clock, ArrowRight, User, Heart, MessageCircle, Share2, List, ChevronDown, ChevronUp, Shield, Plus, X, Edit } from 'lucide-react';

interface Chapter { id: string; chapter_number: number; title: string; views: number; created_at: number; volume_id?: string; }
interface Volume { id: string; volume_number: number; title: string; cover_url?: string; description?: string; chapter_count?: number; }
interface StoryDetail {
  id: string; title: string; description?: string; cover_url?: string;
  type: 'text' | 'comic'; genre?: string; tags?: string; status?: string;
  views: number; rating_avg: number; rating_count: number; user_rating: number;
  bookmark_count: number; comment_count: number; bookmarked: boolean;
  author_name: string; author_avatar?: string; author_id: string;
  chapter_count: number; chapters: Chapter[]; created_at: number; updated_at: number;
}

function StarRating({ rating, onRate, interactive = false, size = 'md' }: { rating: number; onRate?: (r: number) => void; interactive?: boolean; size?: 'sm' | 'md' }) {
  const [hover, setHover] = useState(0);
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}>
          <Star className={`${cls} ${(hover || rating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  );
}

function timeSince(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    const loadStory = async () => {
      try {
        const [storyRes, volumesRes, commentsRes] = await Promise.all([
          api.get(`/stories/${id}`),
          api.get(`/stories/${id}/volumes`).catch(() => ({ data: { volumes: [] } })),
          api.get(`/stories/${id}/comments`).catch(() => ({ data: { comments: [] } }))
        ]);
        setStory(storyRes.data);
        setUserRating(storyRes.data.user_rating || 0);
        setBookmarked(storyRes.data.bookmarked || false);
        setBookmarkCount(storyRes.data.bookmark_count || 0);
        setVolumes(volumesRes.data.volumes || []);
        setComments(commentsRes.data.comments || []);
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
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create volume';
      setVolumeError(errorMsg);
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
      const errorMsg = error.response?.data?.error || error.message || 'Failed to edit volume';
      setEditVolumeError(errorMsg);
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

  const createChapter = async (volumeId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!story) return;

    const form = chapterForms[volumeId];
    if (!form || !form.title.trim()) return;

    if (story.type === 'text' && !form.content.trim()) {
      setChapterErrors(prev => ({ ...prev, [volumeId]: 'Content is required for text chapters' }));
      return;
    }
    if (story.type === 'comic' && form.images.length === 0) {
      setChapterErrors(prev => ({ ...prev, [volumeId]: 'At least one image is required for comic chapters' }));
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('volume_id', volumeId);
    if (story.type === 'text') {
      formData.append('content', form.content);
    } else {
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
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create chapter';
      setChapterErrors(prev => ({ ...prev, [volumeId]: errorMsg }));
    } finally {
      setChapterLoading(prev => ({ ...prev, [volumeId]: false }));
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      const errorMsg = error.response?.data?.error || 'Failed to post comment';
      setCommentError(errorMsg);
    } finally {
      setCommentLoading(false);
    }
  };

  if (!story) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const tags = story.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? [];
  const descTruncated = story.description && story.description.length > 400 && !showFullDesc;

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Hero banner with blurred cover background */}
      <div className="relative overflow-hidden">
        {story.cover_url && (
          <div className="absolute inset-0">
            <img src={story.cover_url} alt="" className="w-full h-full object-cover scale-110 blur-2xl opacity-15" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12]/60 via-[#0a0a12]/80 to-[#0a0a12]" />
          </div>
        )}

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-0">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Cover */}
            <div className="shrink-0 self-center md:self-start">
              <div className="w-52 md:w-60 aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-800/80 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative group">
                {story.cover_url ? (
                  <img src={story.cover_url} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                    {story.type === 'comic' ? <Image className="w-16 h-16 text-slate-700" /> : <BookOpen className="w-16 h-16 text-slate-700" />}
                  </div>
                )}
                {/* Type badge on cover */}
                <span className={`absolute top-3 left-3 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${story.type === 'comic' ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'}`}>
                  {story.type === 'comic' ? 'Comic' : 'Novel'}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 pb-6">
              {/* Genre tags row */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {story.genre && (
                  <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded border border-cyan-500/20">{story.genre}</span>
                )}
                {tags.map(t => (
                  <span key={t} className="px-2.5 py-1 bg-slate-800/80 text-slate-400 text-xs rounded border border-slate-700/50">#{t}</span>
                ))}
                {story.status && (
                  <span className={`px-3 py-1 rounded text-xs font-semibold ml-auto ${story.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : story.status === 'hiatus' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                  {story.status === 'ongoing' ? '● Ongoing' : story.status === 'completed' ? '✓ Completed' : '⏸ Hiatus'}
                </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-3 font-['Rajdhani'] tracking-wide leading-tight">{story.title}</h1>

              {/* Author */}
              <Link to={`/user/${story.author_name}`} className="inline-flex items-center gap-2.5 mb-5 group">
                {story.author_avatar ? (
                  <img src={story.author_avatar} alt="" className="w-9 h-9 rounded-lg object-cover ring-2 ring-cyan-500/20" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center ring-2 ring-slate-700"><User className="w-4 h-4 text-cyan-500/50" /></div>
                )}
                <div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-cyan-400 transition">{story.author_name}</span>
                  <span className="flex items-center gap-1 text-[10px] text-cyan-500/60 font-semibold uppercase tracking-wider"><Shield className="w-3 h-3" />Author</span>
                </div>
              </Link>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {story.chapters.length > 0 && (
                  <Link to={`/story/${story.id}/chapter/1`} className="flex items-center gap-2 px-7 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-[0_0_25px_rgba(0,212,255,0.25)] font-['Rajdhani'] tracking-wide uppercase text-sm">
                    <BookOpen className="w-4 h-4" /> Start Reading
                  </Link>
                )}
                {user && (
                  <button onClick={toggleBookmark} className={`flex items-center gap-2 px-5 py-3 rounded-lg border font-medium transition text-sm ${bookmarked ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/15' : 'border-slate-700 text-slate-400 hover:border-pink-500/30 hover:text-pink-400'}`}>
                    <Heart className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} /> {bookmarked ? 'Saved' : 'Save'}
                  </button>
                )}
                <button onClick={handleShare} className="flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-700 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition text-sm">
                  <Share2 className="w-4 h-4" /> {copied ? 'Copied!' : 'Share'}
                </button>
                {user?.is_admin && (
                  <Link to={`/story/${story.id}/edit`} className="px-4 py-3 rounded-lg border border-slate-700 text-slate-500 hover:border-cyan-500/30 hover:text-cyan-400 transition text-sm">
                    Edit Series
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-y border-slate-800/60 bg-[#0d0d18]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800/60">
            <div className="flex flex-col items-center py-4 gap-1">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-lg font-bold text-slate-100 font-['Rajdhani']">{bookmarkCount.toLocaleString()}</span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Favorites</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-lg font-bold text-slate-100 font-['Rajdhani']">{story.rating_avg ? story.rating_avg.toFixed(2) : '—'}</span>
                <span className="text-xs text-slate-600">/ {story.rating_count}</span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Rating</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-lg font-bold text-slate-100 font-['Rajdhani']">{story.views.toLocaleString()}</span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Views</span>
            </div>
            <div className="flex flex-col items-center py-4 gap-1">
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-lg font-bold text-slate-100 font-['Rajdhani']">{story.comment_count}</span>
              </div>
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content — two-column layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: synopsis */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Synopsis */}
            {story.description && (
              <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
                <h2 className="text-lg font-bold text-slate-100 mb-4 font-['Rajdhani'] tracking-wide flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-500" /> Synopsis
                </h2>
                <div className="relative">
                  <p className={`text-slate-400 leading-relaxed whitespace-pre-wrap ${descTruncated ? 'line-clamp-6' : ''}`}>
                    {story.description}
                  </p>
                  {story.description.length > 400 && (
                    <button onClick={() => setShowFullDesc(!showFullDesc)}
                      className="mt-2 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition">
                      {showFullDesc ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Read More</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:w-72 shrink-0 space-y-6">
            {/* Rate this series */}
            {user && (
              <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3 font-['Rajdhani'] tracking-wide uppercase">Rate this series</h3>
                <div className="flex items-center gap-2">
                  <StarRating rating={userRating} onRate={handleRate} interactive />
                  {userRating > 0 && <span className="text-sm text-amber-400 font-bold">{userRating}/5</span>}
                </div>
              </div>
            )}

            {/* Series info */}
            <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-5">
              <h3 className="text-sm font-bold text-slate-300 mb-4 font-['Rajdhani'] tracking-wide uppercase">Series Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="text-slate-300 font-medium capitalize">{story.type === 'comic' ? 'Comic / Manga' : 'Light Novel'}</dd>
                </div>
                {story.genre && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Genre</dt>
                    <dd className="text-slate-300 font-medium">{story.genre}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd className={`font-medium capitalize ${story.status === 'completed' ? 'text-emerald-400' : story.status === 'hiatus' ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {story.status || 'ongoing'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Chapters</dt>
                  <dd className="text-slate-300 font-medium">{story.chapter_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Views</dt>
                  <dd className="text-slate-300 font-medium">{story.views.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Rating</dt>
                  <dd className="text-amber-400 font-medium">{story.rating_avg ? `${story.rating_avg.toFixed(1)} / 5` : '—'}<span className="text-slate-600 text-xs ml-1">({story.rating_count})</span></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-slate-300 font-medium">{new Date(story.created_at * 1000).toLocaleDateString()}</dd>
                </div>
                {story.updated_at && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Updated</dt>
                    <dd className="text-slate-300 font-medium">{timeSince(story.updated_at)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-5">
                <h3 className="text-sm font-bold text-slate-300 mb-3 font-['Rajdhani'] tracking-wide uppercase">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="px-2.5 py-1 bg-cyan-500/5 text-cyan-400/70 text-xs rounded border border-cyan-500/10">#{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Volume creation form for admins */}
      {user?.is_admin && story?.author_id === user?.id && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {!showVolumeForm ? (
            <button
              onClick={() => setShowVolumeForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 transition text-sm font-medium"
            >
              + Create New Volume
            </button>
          ) : (
            <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-4 font-['Rajdhani'] tracking-wide">Create New Volume</h3>
              {volumeSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                  ✓ Volume created successfully!
                </div>
              )}
              {volumeError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                  ✗ {volumeError}
                </div>
              )}
              <form onSubmit={createVolume} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Volume Title</label>
                  <input
                    type="text"
                    value={volumeForm.title}
                    onChange={(e) => setVolumeForm(v => ({ ...v, title: e.target.value }))}
                    placeholder="e.g., Arc 1: Beginning"
                    disabled={volumeLoading}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description (optional)</label>
                  <textarea
                    value={volumeForm.description}
                    onChange={(e) => setVolumeForm(v => ({ ...v, description: e.target.value }))}
                    placeholder="Brief description of this volume..."
                    disabled={volumeLoading}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVolumeCover(e.target.files?.[0] || null)}
                    disabled={volumeLoading}
                    className="block w-full text-slate-400 text-sm file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!volumeForm.title.trim() || volumeLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    {volumeLoading ? 'Creating...' : 'Create Volume'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Volumes and Chapters section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-4 p-6 border-b border-slate-800/40">
            {story.cover_url && (
              <img src={story.cover_url} alt="" className="w-16 h-22 rounded-lg object-cover border border-slate-700/50 shrink-0 hidden sm:block" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide flex items-center gap-2">
                <List className="w-5 h-5 text-cyan-500" /> {volumes.length > 0 ? 'Volumes' : 'Chapters'}
              </h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 font-semibold">
                  {volumes.length > 0 ? `${volumes.length} volumes` : `${story.chapter_count} chapters`}
                </span>
                {story.chapters.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Last updated {timeSince(story.chapters[story.chapters.length - 1].created_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {story.chapters.length === 0 && volumes.length === 0 ? (
            <p className="text-slate-600 text-center py-16">No chapters published yet. Stay tuned!</p>
          ) : volumes.length > 0 ? (
            <div className="divide-y divide-slate-800/30">
              {volumes.map((vol) => {
                const volChapters = story.chapters.filter(ch => ch.volume_id === vol.id);
                return (
                  <div key={vol.id}>
                    {/* Volume header - cover image and title */}
                    <div className="flex items-center gap-2 px-6 py-4 hover:bg-cyan-500/[0.03] transition group">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedVolumes);
                          if (newExpanded.has(vol.id)) {
                            newExpanded.delete(vol.id);
                          } else {
                            newExpanded.add(vol.id);
                          }
                          setExpandedVolumes(newExpanded);
                        }}
                        className="flex-1 flex items-center gap-4 text-left"
                      >
                        {vol.cover_url && (
                          <img src={vol.cover_url} alt="" className="w-16 h-24 rounded-lg object-cover border border-slate-700/50 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-lg font-bold text-slate-300 group-hover:text-cyan-400 transition block">
                            {vol.title || `Volume ${vol.volume_number}`}
                          </span>
                          {vol.description && (
                            <span className="text-sm text-slate-500 line-clamp-2 block mt-1">{vol.description}</span>
                          )}
                        </div>
                      </button>
                      
                      {/* Edit button - only show for story author */}
                      {user?.id === story?.author_id && (
                        <button
                          onClick={() => initializeEditVolumeForm(vol)}
                          className="shrink-0 p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/5 rounded transition"
                          title="Edit volume"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Expanded volume content */}
                    {expandedVolumes.has(vol.id) && (
                      <div className="bg-slate-900/20 divide-y divide-slate-800/20">
                        {/* Edit volume form - shown when editing */}
                        {editingVolumeId === vol.id && (
                          <div className="p-6 space-y-4 bg-slate-800/30 border-b border-slate-800/40">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-slate-200">Edit Volume</h4>
                              <button
                                onClick={() => setEditingVolumeId(null)}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {editVolumeError && (
                              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                                ✗ {editVolumeError}
                              </div>
                            )}
                            
                            {editVolumeSuccess && (
                              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                                ✓ Volume updated successfully!
                              </div>
                            )}
                            
                            <form onSubmit={(e) => editVolume(vol.id, e)} className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Volume Title</label>
                                <input
                                  type="text"
                                  value={editVolumeForm.title}
                                  onChange={(e) => setEditVolumeForm(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="e.g., Arc 1: The Beginning"
                                  disabled={editVolumeLoading}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                  value={editVolumeForm.description}
                                  onChange={(e) => setEditVolumeForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Brief description of this volume..."
                                  disabled={editVolumeLoading}
                                  rows={3}
                                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Cover Image</label>
                                {editVolumeCoverPreview && (
                                  <div className="mb-3 relative inline-block">
                                    <img src={editVolumeCoverPreview} alt="" className="w-24 h-32 rounded-lg object-cover border border-slate-700" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditVolumeCover(null);
                                        setEditVolumeCoverPreview('');
                                      }}
                                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500/40 transition">
                                  <Image className="w-8 h-8 text-slate-600 mb-2" />
                                  <span className="text-sm text-slate-500">Click to change cover image</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditVolumeCover}
                                    disabled={editVolumeLoading}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                              
                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingVolumeId(null)}
                                  disabled={editVolumeLoading}
                                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition text-sm font-medium"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={!editVolumeForm.title.trim() || editVolumeLoading}
                                  className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15 disabled:opacity-50 transition text-sm font-medium"
                                >
                                  {editVolumeLoading ? 'Updating...' : 'Save Changes'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                        
                        {/* Chapter list - shown first */}
                        {volChapters.length === 0 ? (
                          <p className="text-slate-600 text-center py-6 text-sm">No chapters in this volume yet</p>
                        ) : (
                          <>
                            {volChapters.slice(0, 5).map(ch => {
                              // Check if chapter is new (created within last 7 days)
                              const isNew = (Date.now() / 1000 - ch.created_at) < 7 * 24 * 3600;
                              return (
                                <Link key={ch.id} to={`/story/${story.id}/chapter/${ch.chapter_number}`}
                                  className="flex items-center justify-between px-6 py-3.5 hover:bg-cyan-500/[0.03] transition group">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {isNew && (
                                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30 shrink-0">
                                        Mới
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <span className="font-medium text-slate-300 group-hover:text-cyan-400 transition block">
                                        Chương {ch.chapter_number}: {ch.title}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0 ml-4">
                                    <span className="min-w-[75px] text-right">
                                      {new Date(ch.created_at * 1000).toLocaleDateString('vi-VN')}
                                    </span>
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-cyan-400" />
                                  </div>
                                </Link>
                              );
                            })}
                            {volChapters.length > 5 && (
                              <button
                                onClick={() => {
                                  // For now, just expand to show all chapters
                                  // This is a placeholder for future pagination implementation
                                }}
                                className="w-full px-6 py-3 text-center text-cyan-400 hover:bg-cyan-500/5 transition text-sm font-medium border-t border-slate-800/20"
                              >
                                Xem tiếp ({volChapters.length - 5} chương)
                              </button>
                            )}
                          </>
                        )}

                        {/* Chapter creation form for admins - shown below chapter list */}
                        {user?.is_admin && story?.author_id === user?.id && (
                          <div>
                            {!expandedChapterForms.has(vol.id) ? (
                              <button
                                onClick={() => {
                                  initializeChapterForm(vol.id);
                                  setExpandedChapterForms(prev => new Set([...prev, vol.id]));
                                }}
                                className="w-full px-6 py-3 flex items-center gap-2 text-cyan-400 hover:bg-cyan-500/5 transition text-sm font-medium"
                              >
                                <Plus className="w-4 h-4" /> Create Chapter in This Volume
                              </button>
                            ) : (
                              <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-bold text-slate-200">Create New Chapter</h4>
                                  <button
                                    onClick={() => setExpandedChapterForms(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(vol.id);
                                      return newSet;
                                    })}
                                    className="text-slate-500 hover:text-slate-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {chapterSuccess[vol.id] && (
                                  <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm">
                                    ✓ Chapter created successfully!
                                  </div>
                                )}
                                {chapterErrors[vol.id] && (
                                  <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                                    ✗ {chapterErrors[vol.id]}
                                  </div>
                                )}

                                <form onSubmit={(e) => createChapter(vol.id, e)} className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Chapter Title</label>
                                    <input
                                      type="text"
                                      value={chapterForms[vol.id]?.title || ''}
                                      onChange={(e) => setChapterForms(prev => ({
                                        ...prev,
                                        [vol.id]: { ...prev[vol.id], title: e.target.value }
                                      }))}
                                      placeholder={`e.g., Chapter ${volChapters.length + 1}: Title`}
                                      disabled={chapterLoading[vol.id]}
                                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                                    />
                                  </div>

                                  {story.type === 'text' ? (
                                    <div>
                                      <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
                                      <textarea
                                        value={chapterForms[vol.id]?.content || ''}
                                        onChange={(e) => setChapterForms(prev => ({
                                          ...prev,
                                          [vol.id]: { ...prev[vol.id], content: e.target.value }
                                        }))}
                                        placeholder="Write chapter content here..."
                                        disabled={chapterLoading[vol.id]}
                                        rows={12}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none disabled:opacity-50"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-sm font-medium text-slate-300 mb-1">Upload Pages</label>
                                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500/40 transition">
                                        <Image className="w-8 h-8 text-slate-600 mb-2" />
                                        <span className="text-sm text-slate-500">Click to upload images</span>
                                        <span className="text-xs text-slate-600 mt-1">PNG, JPG, WebP up to 10MB each</span>
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
                                              <img src={src} alt={`Page ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-slate-800/60" />
                                              <span className="absolute bottom-2 left-2 bg-black/60 text-slate-300 text-xs px-2 py-0.5 rounded">{i + 1}</span>
                                              <button
                                                type="button"
                                                onClick={() => removeChapterImage(vol.id, i)}
                                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                              >
                                                <X className="w-3 h-3" />
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
                                      className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition text-sm font-medium"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={!chapterForms[vol.id]?.title.trim() || chapterLoading[vol.id]}
                                      className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15 disabled:opacity-50 transition text-sm font-medium"
                                    >
                                      {chapterLoading[vol.id] ? 'Publishing...' : 'Publish Chapter'}
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
            <div className="divide-y divide-slate-800/30">
              {story.chapters.map(ch => (
                <Link key={ch.id} to={`/story/${story.id}/chapter/${ch.chapter_number}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-cyan-500/[0.03] transition group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-slate-800/80 text-cyan-400/80 flex items-center justify-center text-sm font-bold shrink-0 font-['Rajdhani'] group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition">
                      {ch.chapter_number}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-slate-300 group-hover:text-cyan-400 transition truncate block">
                        Chapter {ch.chapter_number}: {ch.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0 ml-4">
                    <span className="hidden sm:flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{ch.views}</span>
                    <span className="flex items-center gap-1 min-w-[70px] justify-end">
                      <Clock className="w-3.5 h-3.5" />{new Date(ch.created_at * 1000).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition text-cyan-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comments section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="p-6 border-b border-slate-800/40">
            <h2 className="text-xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-cyan-500" /> Comments
            </h2>
          </div>

          <div className="p-6">
            {/* Comment form */}
            {user ? (
              <form onSubmit={addComment} className="mb-6 space-y-3">
                {commentError && (
                  <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                    ✗ {commentError}
                  </div>
                )}
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this story..."
                  disabled={commentLoading}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none h-20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || commentLoading}
                    className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    {commentLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 text-slate-400 text-sm text-center">
                <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Sign in
                </Link>
                {' '}to comment on this story
              </div>
            )}

            {/* Comments list */}
            {comments.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-800/30">
                {comments.map(comment => (
                  <div key={comment.id} className="pt-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      {comment.avatar_url ? (
                        <img src={comment.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-300">{comment.username}</span>
                          <span className="text-xs text-slate-600">
                            {new Date(comment.created_at * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mt-1 break-words">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
