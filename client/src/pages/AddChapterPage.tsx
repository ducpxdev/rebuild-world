import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload, X, Image, FileText } from 'lucide-react';
import { apiErrorMessage } from '../lib/i18n';
import { Alert } from '../components/ui';

interface Volume {
  id: string;
  volume_number: number;
  title: string;
}

export default function AddChapterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [storyType, setStoryType] = useState<'text' | 'comic' | null>(null);
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch story type and volumes on mount
  useEffect(() => {
    Promise.all([
      api.get(`/stories/${id}`).then(r => setStoryType(r.data.type)),
      api.get(`/stories/${id}/volumes`).then(r => {
        const vols = r.data.volumes || [];
        setVolumes(vols);
        // Select first volume by default
        if (vols.length > 0) {
          setSelectedVolumeId(vols[0].id);
        }
      }).catch(() => setVolumes([]))
    ]);
  }, [id]);

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
    if (selectedVolumeId) formData.append('volume_id', selectedVolumeId);
    if (storyType === 'text') {
      formData.append('content', content);
    } else {
      images.forEach(f => formData.append('images', f));
    }

    try {
      await api.post(`/stories/${id}/chapters`, formData);
      navigate(`/story/${id}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể thêm chương'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="section-title text-3xl mb-8">Thêm chương mới</h1>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        {error && <Alert kind="error">{error}</Alert>}

        <div>
          <label className="label">Tiêu đề chương</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="input" placeholder="VD: Khởi đầu" />
        </div>

        {volumes.length > 0 && (
          <div>
            <label className="label">Tập</label>
            <select value={selectedVolumeId} onChange={e => setSelectedVolumeId(e.target.value)}
              className="input">
              {volumes.map(vol => (
                <option key={vol.id} value={vol.id}>
                  Tập {vol.volume_number}: {vol.title || `Tập ${vol.volume_number}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {storyType === 'text' ? (
          <div>
            <label className="label flex items-center gap-2">
              <FileText className="w-4 h-4" /> Nội dung chương <span className="text-red-400">*</span>
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={20} required
              className="input resize-y font-mono text-sm leading-relaxed"
              placeholder="Viết nội dung chương tại đây…" />
          </div>
        ) : (
          <div>
            <label className="label flex items-center gap-2">
              <Image className="w-4 h-4" /> Tải lên các trang <span className="text-red-400">*</span>
            </label>
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/60 hover:bg-primary-500/5 transition">
              <Upload className="w-10 h-10 text-ink-600 mb-3" />
              <span className="text-sm text-ink-400">Nhấn để tải hình ảnh lên</span>
              <span className="text-xs text-ink-500 mt-1">PNG, JPG, WebP, tối đa 10MB mỗi ảnh</span>
              <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
            </label>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Trang ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-ink-800/60" />
                    <span className="absolute bottom-2 left-2 bg-black/60 text-ink-300 text-xs px-2 py-0.5 rounded">{i + 1}</span>
                    <button type="button" onClick={() => removeImage(i)} aria-label={`Bỏ trang ${i + 1}`}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn btn-primary btn-lg w-full">
          {loading ? 'Đang đăng…' : 'Đăng chương'}
        </button>
      </form>
    </div>
  );
}
