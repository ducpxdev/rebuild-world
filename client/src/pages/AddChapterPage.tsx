import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload, X, Image, FileText } from 'lucide-react';

export default function AddChapterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [storyType, setStoryType] = useState<'text' | 'comic' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch story type on mount
  useState(() => {
    api.get(`/stories/${id}`).then(r => setStoryType(r.data.type));
  });

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    if (title) formData.append('title', title);
    if (storyType === 'text') {
      formData.append('content', content);
    } else {
      images.forEach(f => formData.append('images', f));
    }

    try {
      await api.post(`/stories/${id}/chapters`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/story/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add chapter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8 font-['Rajdhani'] tracking-wide">Add New Chapter</h1>

      <form onSubmit={handleSubmit} className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-8 space-y-6">
        {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Chapter Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="e.g. The Beginning" />
        </div>

        {storyType === 'text' ? (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-1">
              <FileText className="w-4 h-4" /> Chapter Content *
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} required
              className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none resize-none font-mono text-sm leading-relaxed text-slate-300 placeholder-slate-600"
              placeholder="Write your chapter here..." />
          </div>
        ) : (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
              <Image className="w-4 h-4" /> Upload Pages *
            </label>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500/40 transition">
              <Upload className="w-10 h-10 text-slate-600 mb-3" />
              <span className="text-sm text-slate-500">Click to upload images</span>
              <span className="text-xs text-slate-600 mt-1">PNG, JPG, WebP up to 10MB each</span>
              <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Page ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-slate-800/60" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-slate-300 text-xs px-2 py-0.5 rounded">{i + 1}</span>
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] tracking-wide uppercase text-lg">
          {loading ? 'Publishing...' : 'Publish Chapter'}
        </button>
      </form>
    </div>
  );
}
