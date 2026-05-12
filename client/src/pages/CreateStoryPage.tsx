import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { BookOpen, Image, Upload, X } from 'lucide-react';

const GENRES = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure', 'Mystery', 'Comedy', 'Drama', 'Slice of Life', 'Action'];
const TAG_CATEGORIES = {
  light_novel: { label: 'Light Novel', color: 'red' },
  web_novel: { label: 'Web Novel', color: 'yellow' },
  manga: { label: 'Manga', color: 'orange' },
};

export default function CreateStoryPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'text' | 'comic'>('text');
  const [genres, setGenres] = useState<string[]>([]);
  const [workAuthorName, setWorkAuthorName] = useState('');
  const [illustratorName, setIllustratorName] = useState('');
  const [translatorName, setTranslatorName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', type);
    formData.append('genre', genres.join(', '));
    formData.append('work_author_name', workAuthorName);
    formData.append('illustrator_name', illustratorName);
    formData.append('translator_name', translatorName);
    formData.append('tags', selectedTags.join(', '));
    if (cover) formData.append('cover', cover);

    try {
      const r = await api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/story/${r.data.id}`);
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 font-['Rajdhani'] tracking-wide">Create a New Story</h1>

      <form onSubmit={handleSubmit} className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-8 space-y-6">
        {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm">{error}</div>}

        {/* Type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Story Type</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setType('text')}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition ${type === 'text' ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-cyan-500/30'}`}>
              <BookOpen className={`w-10 h-10 ${type === 'text' ? 'text-cyan-400' : 'text-slate-600'}`} />
              <div className="text-center">
                <span className={`font-semibold ${type === 'text' ? 'text-cyan-400' : 'text-slate-400'}`}>Text Story</span>
                <p className="text-xs text-slate-600 mt-1">Written chapters with text content</p>
              </div>
            </button>
            <button type="button" onClick={() => setType('comic')}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition ${type === 'comic' ? 'border-amber-500 bg-amber-500/5' : 'border-slate-800 hover:border-amber-500/30'}`}>
              <Image className={`w-10 h-10 ${type === 'comic' ? 'text-amber-400' : 'text-slate-600'}`} />
              <div className="text-center">
                <span className={`font-semibold ${type === 'comic' ? 'text-amber-400' : 'text-slate-400'}`}>Comic / Manga</span>
                <p className="text-xs text-slate-600 mt-1">Image-based chapters and panels</p>
              </div>
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Title *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="Give your story a title" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none resize-none text-slate-300 placeholder-slate-600" placeholder="What's your story about?" />
        </div>

        {/* Cover */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Cover Image</label>
          {coverPreview ? (
            <div className="relative w-40">
              <img src={coverPreview} alt="Cover" className="w-40 h-56 object-cover rounded-xl border border-slate-800/60" />
              <button type="button" onClick={() => { setCover(null); setCoverPreview(''); }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-40 h-56 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500/40 transition">
              <Upload className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-xs text-slate-600">Upload cover</span>
              <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
            </label>
          )}
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

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] tracking-wide uppercase text-lg">
          {loading ? 'Creating...' : 'Create Story'}
        </button>
      </form>
    </div>
  );
}
