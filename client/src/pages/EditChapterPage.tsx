import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Upload, X, Image, FileText, Trash2, ArrowLeft } from 'lucide-react';
import { apiErrorMessage } from '../lib/i18n';
import { Alert, PageLoader } from '../components/ui';

export default function EditChapterPage() {
  const { id, number } = useParams<{ id: string; number: string }>();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLTextAreaElement>(null);
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

  const insertTextAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + text + after;
    
    setContent(newContent);
    
    // Restore focus and set cursor after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
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
      setError(apiErrorMessage(err, 'Không thể cập nhật chương'));
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
      setError(apiErrorMessage(err, 'Không thể xóa chương'));
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/story/${id}/chapter/${number}`} className="btn btn-ghost btn-sm -ml-3 mb-3"><ArrowLeft className="w-4 h-4" /> Về chương</Link>
      <h1 className="section-title text-3xl mb-2">Sửa chương {number}</h1>
      <p className="text-ink-500 mb-8 text-sm">Mọi thay đổi sẽ được cập nhật ngay sau khi lưu.</p>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        {error && <Alert kind="error">{error}</Alert>}

        <div>
          <label className="label">Tiêu đề chương</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="input" placeholder="Tiêu đề chương" />
        </div>

        {storyType === 'text' ? (
          <div className="space-y-6">
            <div>
              <label className="label flex items-center gap-2">
                <FileText className="w-4 h-4" /> Nội dung chương
              </label>
              <textarea 
                ref={contentRef}
                value={content} 
                onChange={e => setContent(e.target.value)} 
                rows={20}
                className="input resize-y font-mono text-sm leading-relaxed"
                placeholder="Nội dung chương… Bạn có thể chèn hình ảnh ở bên dưới." />
            </div>

            <div>
              <label className="label">Chèn hình ảnh vào nội dung</label>
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/60 hover:bg-primary-500/5 transition">
                <Image className="w-6 h-6 text-ink-600 mb-1" />
                <span className="text-sm text-ink-400">Nhấn để thêm hình ảnh</span>
                <span className="text-xs text-ink-500 mt-1">Hình ảnh sẽ được chèn vào nội dung chương</span>
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
                  <p className="text-xs text-ink-400">Nhấn vào một hình để chèn vào vị trí con trỏ:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {textImagePreviews.map((src, i) => (
                      <div key={i} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            const imageName = `image-${i + 1}`;
                            const markdownImage = `![${imageName}](${src})\n`;
                            insertTextAtCursor(markdownImage);
                          }}
                          className="w-full text-left"
                        >
                          <img src={src} alt={`Hình ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-ink-700 hover:border-primary-500 transition group-hover:opacity-75" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 transition rounded-lg">
                            Nhấn để chèn
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTextImage(i)}
                          aria-label={`Bỏ hình ${i + 1}`}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition text-xs"
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
            <label className="label flex items-center gap-2">
              <Image className="w-4 h-4" /> Các trang của chương
            </label>

            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-ink-500 mb-2">Các trang hiện tại ({existingImages.length})</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {existingImages.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt={`Trang ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-ink-800/60" />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-ink-300 text-[10px] px-1.5 py-0.5 rounded">{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload new */}
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/60 hover:bg-primary-500/5 transition">
              <Upload className="w-8 h-8 text-ink-600 mb-2" />
              <span className="text-sm text-ink-400">Tải lên trang mới để thay thế các trang hiện tại</span>
              <span className="text-xs text-ink-500 mt-1">PNG, JPG, WebP, tối đa 10MB mỗi ảnh</span>
              <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
            </label>

            {newPreviews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-3">
                {newPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt={`Trang mới ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded-lg border border-primary-500/20" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-primary-300 text-[10px] px-1.5 py-0.5 rounded">Mới {i + 1}</span>
                    <button type="button" onClick={() => removeNewImage(i)} aria-label={`Bỏ trang mới ${i + 1}`}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
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
            className="btn btn-primary btn-lg flex-1">
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
          <button type="button" onClick={() => navigate(`/story/${id}/chapter/${number}`)}
            className="btn btn-secondary btn-lg">
            Hủy
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 card !border-red-500/30 p-6">
        <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Vùng nguy hiểm</h3>
        <p className="text-sm text-ink-500 mb-4">Xóa vĩnh viễn chương này cùng toàn bộ bình luận. Thao tác này không thể hoàn tác.</p>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger">
              {deleting ? 'Đang xóa…' : 'Xác nhận xóa chương'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
              Hủy
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn border border-red-500/40 text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" /> Xóa chương
          </button>
        )}
      </div>
    </div>
  );
}
