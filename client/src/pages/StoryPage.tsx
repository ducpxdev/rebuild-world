import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Star, Eye, BookOpen, Image, Clock, ArrowRight, User, Heart, MessageCircle, Share2, List, ChevronDown, ChevronUp, Shield } from 'lucide-react';

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
  const [userRating, setUserRating] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [volumeForm, setVolumeForm] = useState({ title: '', description: '' });
  const [volumeCover, setVolumeCover] = useState<File | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/stories/${id}`),
      api.get(`/stories/${id}/volumes`)
    ]).then(([storyRes, volumesRes]) => {
      setStory(storyRes.data);
      setUserRating(storyRes.data.user_rating || 0);
      setBookmarked(storyRes.data.bookmarked || false);
      setBookmarkCount(storyRes.data.bookmark_count || 0);
      setVolumes(volumesRes.data.volumes || []);
      // Expand first volume by default
      if (volumesRes.data.volumes?.length > 0) {
        setExpandedVolumes(new Set([volumesRes.data.volumes[0].id]));
      }
    });
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

    try {
      await api.post(`/stories/${id}/volumes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVolumeForm({ title: '', description: '' });
      setVolumeCover(null);
      setShowVolumeForm(false);
      // Refresh volumes
      const res = await api.get(`/stories/${id}/volumes`);
      setVolumes(res.data.volumes || []);
    } catch (error) {
      console.error('Failed to create volume:', error);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                  <>
                    <Link to={`/story/${story.id}/add-chapter`} className="flex items-center gap-1.5 px-4 py-3 rounded-lg border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 transition text-sm font-medium">
                      + Chapter
                    </Link>
                    <Link to={`/story/${story.id}/edit`} className="px-4 py-3 rounded-lg border border-slate-700 text-slate-500 hover:border-cyan-500/30 hover:text-cyan-400 transition text-sm">
                      Edit Series
                    </Link>
                  </>
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
              + Add New Volume
            </button>
          ) : (
            <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-4 font-['Rajdhani'] tracking-wide">Create New Volume</h3>
              <form onSubmit={createVolume} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Volume Title</label>
                  <input
                    type="text"
                    value={volumeForm.title}
                    onChange={(e) => setVolumeForm(v => ({ ...v, title: e.target.value }))}
                    placeholder="e.g., Arc 1: Beginning"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description (optional)</label>
                  <textarea
                    value={volumeForm.description}
                    onChange={(e) => setVolumeForm(v => ({ ...v, description: e.target.value }))}
                    placeholder="Brief description of this volume..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Cover Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setVolumeCover(e.target.files?.[0] || null)}
                    className="block w-full text-slate-400 text-sm file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVolumeForm(false);
                      setVolumeForm({ title: '', description: '' });
                      setVolumeCover(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!volumeForm.title.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                  >
                    Create Volume
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Chapter list — full-width section below */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden">
          {/* Chapter header with cover thumbnail */}
          <div className="flex items-start gap-4 p-6 border-b border-slate-800/40">
            {story.cover_url && (
              <img src={story.cover_url} alt="" className="w-16 h-22 rounded-lg object-cover border border-slate-700/50 shrink-0 hidden sm:block" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
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
                {user?.is_admin && (
                  <Link to={`/story/${story.id}/add-chapter`} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15 transition text-sm font-medium shrink-0">
                    + Add Chapter
                  </Link>
                )}
              </div>
            </div>
          </div>

          {story.chapters.length === 0 ? (
            <p className="text-slate-600 text-center py-16">No chapters published yet. Stay tuned!</p>
          ) : volumes.length > 0 ? (
            <div className="divide-y divide-slate-800/30">
              {volumes.map(vol => (
                <div key={vol.id}>
                  {/* Volume header */}
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
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-cyan-500/[0.03] transition group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {vol.cover_url && (
                        <img src={vol.cover_url} alt="" className="w-12 h-16 rounded-lg object-cover border border-slate-700/50 shrink-0 hidden sm:block" />
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-slate-300 group-hover:text-cyan-400 transition block">
                          Volume {vol.volume_number}: {vol.title || `Volume ${vol.volume_number}`}
                        </span>
                        {vol.description && (
                          <span className="text-sm text-slate-500 truncate block">{vol.description}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 shrink-0 ml-4">
                      <span className="text-xs">{story.chapters.filter(ch => ch.volume_id === vol.id).length} chapters</span>
                      {expandedVolumes.has(vol.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Chapter list for this volume */}
                  {expandedVolumes.has(vol.id) && (
                    <div className="bg-slate-900/20 divide-y divide-slate-800/20">
                      {story.chapters
                        .filter(ch => ch.volume_id === vol.id)
                        .map(ch => (
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
              ))}
            </div>
          ) : (
            <div>
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
              {story.chapters.length > 10 && (
                <button onClick={() => setShowAllChapters(!showAllChapters)}
                  className="w-full py-3.5 border-t border-slate-800/40 text-sm text-cyan-400 hover:bg-cyan-500/5 transition flex items-center justify-center gap-1 font-medium">
                  {showAllChapters ? <><ChevronUp className="w-4 h-4" /> Show Less</> : <><ChevronDown className="w-4 h-4" /> Show All {story.chapter_count} Chapters</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
