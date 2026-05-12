import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload, X, Trash2 } from 'lucide-react';

const GENRES = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure', 'Mystery', 'Comedy', 'Drama', 'Slice of Life', 'Action'];
const TAG_CATEGORIES = {
  light_novel: { label: 'Light Novel', color: 'red' },
  web_novel: { label: 'Web Novel', color: 'yellow' },
  manga: { label: 'Manga', color: 'orange' },
};

export default function EditStoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'text' | 'comic'>('text');
  const [genres, setGenres] = useState<string[]>([]);
  const [workAuthorName, setWorkAuthorName] = useState('');
  const [illustratorName, setIllustratorName] = useState('');
  const [translatorName, setTranslatorName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState('ongoing');
  const [isPublished, setIsPublished] = useState(true);
  const [existingCover, setExistingCover] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api.get(`/stories/${id}`).then(r => {
      const s = r.data;
      setTitle(s.title);
      setDescription(s.description || '');
      setType(s.type || 'text');
      setGenres((s.genre || '').split(',').map((g: string) => g.trim()).filter(Boolean));
      setWorkAuthorName(s.work_author_name || '');
      setIllustratorName(s.illustrator_name || '');
      setTranslatorName(s.translator_name || '');
      setSelectedTags((s.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean));
      setStatus(s.status || 'ongoing');
      setIsPublished(!!s.is_published);
      setExistingCover(s.cover_url || '');
      setLoading(false);
    });
  }, [id]);

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCover(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('genre', genres.join(', '));
    formData.append('work_author_name', workAuthorName);
    formData.append('illustrator_name', illustratorName);
    formData.append('translator_name', translatorName);
    formData.append('tags', selectedTags.join(', '));
    formData.append('status', status);
    formData.append('is_published', isPublished ? '1' : '0');
    if (cover) formData.append('cover', cover);

    try {
      await api.put(`/stories/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/story/${id}`);
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Failed to update story');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/stories/${id}`);
      navigate('/dashboard');
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Failed to delete story');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  const displayCover = coverPreview || existingCover;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 font-['Rajdhani'] tracking-wide">Edit Series</h1>

      <form onSubmit={handleSubmit} className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-8 space-y-6">
        {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm">{error}</div>}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Title *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Synopsis</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={6}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none resize-none text-slate-300 placeholder-slate-600" placeholder="What's your story about?" />
        </div>

        {/* Cover */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Cover Image</label>
          <div className="flex items-start gap-4">
            {displayCover ? (
              <div className="relative w-40">
                <img src={displayCover} alt="Cover" className="w-40 h-56 object-cover rounded-xl border border-slate-800/60" />
                <button type="button" onClick={() => { setCover(null); setCoverPreview(''); }}
                  className={`absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 ${!coverPreview ? 'hidden' : ''}`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : null}
            <label className="flex flex-col items-center justify-center w-40 h-56 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500/40 transition">
              <Upload className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs text-slate-600">{displayCover ? 'Replace' : 'Upload'}</span>
              <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
            </label>
          </div>
        </div>

        {/* Genre */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Genres</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GENRES.map(g => (
              <label key={g} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={genres.includes(g)} onChange={e => {
                  if (e.target.checked) {
                    setGenres([...genres, g]);
                  } else {
                    setGenres(genres.filter(x => x !== g));
                  }
                }}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-900" />
                <span className="text-sm text-slate-400 group-hover:text-slate-300">{g}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Work Author Name */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Author Name</label>
          <input type="text" value={workAuthorName} onChange={e => setWorkAuthorName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="Name of the work's author (optional)" />
        </div>

        {/* Illustrator Name */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Illustrator Name</label>
          <input type="text" value={illustratorName} onChange={e => setIllustratorName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="Name of the illustrator (optional)" />
        </div>

        {/* Translator Name */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Translator Name</label>
          <input type="text" value={translatorName} onChange={e => setTranslatorName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="Name of the translator (optional)" />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Categories</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {type === 'text' ? (
              <>
                {['light_novel', 'web_novel'].map(tagKey => {
                  const tag = TAG_CATEGORIES[tagKey as keyof typeof TAG_CATEGORIES];
                  const colorMap = {
                    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
                    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                    orange: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
                  };
                  const colors = colorMap[tag.color as keyof typeof colorMap];
                  return (
                    <label key={tagKey} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedTags.includes(tagKey) ? `${colors.bg} ${colors.border} ${colors.text}` : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <input type="checkbox" checked={selectedTags.includes(tagKey)} onChange={e => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tagKey]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tagKey));
                        }
                      }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900" />
                      <span className="text-sm font-medium">{tag.label}</span>
                    </label>
                  );
                })}
              </>
            ) : (
              <>
                {['manga'].map(tagKey => {
                  const tag = TAG_CATEGORIES[tagKey as keyof typeof TAG_CATEGORIES];
                  const colorMap = {
                    red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
                    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
                    orange: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
                  };
                  const colors = colorMap[tag.color as keyof typeof colorMap];
                  return (
                    <label key={tagKey} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedTags.includes(tagKey) ? `${colors.bg} ${colors.border} ${colors.text}` : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                      <input type="checkbox" checked={selectedTags.includes(tagKey)} onChange={e => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tagKey]);
                        } else {
                          setSelectedTags(selectedTags.filter(t => t !== tagKey));
                        }
                      }}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-900" />
                      <span className="text-sm font-medium">{tag.label}</span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
          <div className="flex gap-3">
            {(['ongoing', 'completed', 'hiatus'] as const).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition capitalize ${status === s
                  ? s === 'ongoing' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : s === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsPublished(!isPublished)}
            className={`relative w-11 h-6 rounded-full transition ${isPublished ? 'bg-cyan-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublished ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-slate-400">{isPublished ? 'Published' : 'Draft'}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] tracking-wide uppercase text-lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/story/${id}`)}
            className="px-6 py-3 border border-slate-700 text-slate-400 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 transition">
            Cancel
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 bg-[#12121e] rounded-xl border border-red-500/20 p-6">
        <h3 className="text-sm font-bold text-red-400 mb-2 font-['Rajdhani'] tracking-wide uppercase">Danger Zone</h3>
        <p className="text-sm text-slate-500 mb-4">Permanently delete this series and all its chapters. This action cannot be undone.</p>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50 transition text-sm">
              {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-5 py-2.5 border border-slate-700 text-slate-400 rounded-lg hover:text-slate-300 transition text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition text-sm">
            <Trash2 className="w-4 h-4" /> Delete Series
          </button>
        )}
      </div>
    </div>
  );
}
