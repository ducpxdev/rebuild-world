import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload, X, Image, FileText, Trash2 } from 'lucide-react';

export default function EditChapterPage() {
  const { id, number } = useParams<{ id: string; number: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [storyType, setStoryType] = useState<'text' | 'comic' | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [textImages, setTextImages] = useState<File[]>([]);
  const [textImagePreviews, setTextImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/stories/${id}`),
      api.get(`/stories/${id}/chapters/${number}`)
    ]).then(([storyRes, chapterRes]) => {
      setStoryType(storyRes.data.type);
      const ch = chapterRes.data;
      setTitle(ch.title || '');
      setContent(ch.content || '');
      if (ch.images) {
        try { setExistingImages(JSON.parse(ch.images)); } catch { /* ignore */ }
      }
      setLoading(false);
    });
  }, [id, number]);

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeNewImage = (idx: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTextImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setTextImages(prev => [...prev, ...files]);
    setTextImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeTextImage = (idx: number) => {
    setTextImages(prev => prev.filter((_, i) => i !== idx));
    setTextImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formData = new FormData();
    formData.append('title', title);
    if (storyType === 'text') {
      formData.append('content', content);
      // For text chapters, upload any embedded images
      textImages.forEach(f => formData.append('text_images', f));
    } else if (newImages.length > 0) {
      newImages.forEach(f => formData.append('images', f));
    }

    try {
      await api.put(`/stories/${id}/chapters/${number}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/story/${id}/chapter/${number}`);
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Failed to update chapter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/stories/${id}/chapters/${number}`);
      navigate(`/story/${id}`);
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setError(error.response?.data?.error || 'Failed to delete chapter');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-2 font-['Rajdhani'] tracking-wide">Edit Chapter {number}</h1>
      <p className="text-slate-500 mb-8 text-sm">Editing chapter content. Changes will be published immediately.</p>

      <form onSubmit={handleSubmit} className="bg-[#12121e] rounded-xl border border-slate-800/60 p-6 md:p-8 space-y-6">
        {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Chapter Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-slate-300 placeholder-slate-600" placeholder="Chapter title" />
        </div>

        {storyType === 'text' ? (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-1">
                <FileText className="w-4 h-4" /> Chapter Content
              </label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={20}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700/50 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none resize-none font-mono text-sm leading-relaxed text-slate-300 placeholder-slate-600"
                placeholder="Chapter content... You can insert images below." />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Insert Images into Content</label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500/40 transition">
                <Image className="w-6 h-6 text-slate-600 mb-1" />
                <span className="text-sm text-slate-500">Click to add images</span>
                <span className="text-xs text-slate-600 mt-1">Images will be inserted into your content</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleTextImages}
                  className="hidden"
                />
              </label>

              {textImagePreviews.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-400">Click an image to insert it into your content:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {textImagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            const imageName = `image-${i + 1}`;
                            const markdownImage = `![${imageName}](${src})\n`;
                            setContent(prev => prev + markdownImage);
                          }}
                          className="w-full text-left"
                        >
                          <img src={src} alt={`Image ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-slate-700 hover:border-cyan-500 transition group-hover:opacity-75" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition rounded-lg">
                            Click to insert
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTextImage(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
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
            <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
              <Image className="w-4 h-4" /> Chapter Pages
            </label>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2">Current pages ({existingImages.length})</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {existingImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`Page ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-slate-800/60" />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload new */}
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-cyan-500/40 transition">
              <Upload className="w-8 h-8 text-slate-600 mb-2" />
              <span className="text-sm text-slate-500">Upload new pages to replace existing</span>
              <span className="text-xs text-slate-600 mt-1">PNG, JPG, WebP up to 10MB each</span>
              <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
            </label>

            {newPreviews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-3">
                {newPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`New ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-cyan-500/20" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded">New {i + 1}</span>
                    <button type="button" onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 disabled:opacity-50 transition shadow-[0_0_20px_rgba(0,212,255,0.2)] font-['Rajdhani'] tracking-wide uppercase text-lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/story/${id}/chapter/${number}`)}
            className="px-6 py-3 border border-slate-700 text-slate-400 rounded-lg hover:border-cyan-500/30 hover:text-cyan-400 transition">
            Cancel
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 bg-[#12121e] rounded-xl border border-red-500/20 p-6">
        <h3 className="text-sm font-bold text-red-400 mb-2 font-['Rajdhani'] tracking-wide uppercase">Danger Zone</h3>
        <p className="text-sm text-slate-500 mb-4">Permanently delete this chapter and all its comments.</p>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50 transition text-sm">
              {deleting ? 'Deleting...' : 'Yes, Delete Chapter'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-5 py-2.5 border border-slate-700 text-slate-400 rounded-lg hover:text-slate-300 transition text-sm">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition text-sm">
            <Trash2 className="w-4 h-4" /> Delete Chapter
          </button>
        )}
      </div>
    </div>
  );
}
