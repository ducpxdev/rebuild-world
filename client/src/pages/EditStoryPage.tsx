import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Trash2, ArrowLeft } from 'lucide-react';
import { apiErrorMessage, STATUS_LABELS } from '../lib/i18n';
import { Alert, PageLoader } from '../components/ui';
import { GenrePicker, CategoryPicker, CoverPicker } from '../components/StoryFormFields';

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
    }).catch(err => {
      setError(apiErrorMessage(err, 'Không thể tải thông tin truyện'));
      setLoading(false);
    });
  }, [id]);

  const handleCover = (file: File) => {
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Vui lòng nhập tên truyện');
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
      setError(apiErrorMessage(err, 'Không thể cập nhật truyện'));
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
      setError(apiErrorMessage(err, 'Không thể xóa truyện'));
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader />;

  const statusStyles: Record<string, string> = {
    ongoing: 'bg-primary-500/10 border-primary-500/40 text-primary-300',
    completed: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
    hiatus: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/story/${id}`} className="btn btn-ghost btn-sm -ml-3 mb-3"><ArrowLeft className="w-4 h-4" /> Về trang truyện</Link>
      <h1 className="section-title text-3xl mb-8">Sửa thông tin truyện</h1>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-7">
        {error && <Alert kind="error">{error}</Alert>}

        <div>
          <label htmlFor="edit-title" className="label">Tên truyện <span className="text-red-400">*</span></label>
          <input id="edit-title" type="text" required value={title} onChange={e => setTitle(e.target.value)} className="input" />
        </div>

        <div>
          <label htmlFor="edit-desc" className="label">Giới thiệu</label>
          <textarea id="edit-desc" value={description} onChange={e => setDescription(e.target.value)} rows={6} className="input resize-y" placeholder="Bộ truyện kể về điều gì?" />
        </div>

        <CoverPicker
          preview={coverPreview || existingCover}
          onFile={handleCover}
          onClear={() => { setCover(null); setCoverPreview(''); }}
          canClear={!!coverPreview}
        />

        <GenrePicker value={genres} onChange={setGenres} />

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="edit-author" className="label">Tác giả</label>
            <input id="edit-author" type="text" value={workAuthorName} onChange={e => setWorkAuthorName(e.target.value)} className="input" placeholder="Tên tác giả gốc" />
          </div>
          <div>
            <label htmlFor="edit-illustrator" className="label">Họa sĩ minh họa</label>
            <input id="edit-illustrator" type="text" value={illustratorName} onChange={e => setIllustratorName(e.target.value)} className="input" placeholder="Không bắt buộc" />
          </div>
          <div>
            <label htmlFor="edit-translator" className="label">Dịch giả</label>
            <input id="edit-translator" type="text" value={translatorName} onChange={e => setTranslatorName(e.target.value)} className="input" placeholder="Không bắt buộc" />
          </div>
        </div>

        <CategoryPicker type={type} value={selectedTags} onChange={setSelectedTags} />

        <fieldset>
          <legend className="label">Tình trạng</legend>
          <div className="flex flex-wrap gap-2">
            {(['ongoing', 'completed', 'hiatus'] as const).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
                className={`btn border ${status === s ? statusStyles[s] : 'border-line text-ink-400 hover:text-ink-200'}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button type="button" role="switch" aria-checked={isPublished} aria-label="Xuất bản truyện" onClick={() => setIsPublished(!isPublished)}
            className={`relative w-11 h-6 rounded-full transition ${isPublished ? 'bg-primary-500' : 'bg-ink-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPublished ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
          <span className="text-sm text-ink-300">{isPublished ? 'Đã xuất bản' : 'Bản nháp (chưa công khai)'}</span>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={() => navigate(`/story/${id}`)} className="btn btn-secondary btn-lg">
            Hủy
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary btn-lg flex-1">
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="mt-8 card !border-red-500/30 p-6">
        <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wider">Vùng nguy hiểm</h3>
        <p className="text-sm text-ink-500 mb-4">Xóa vĩnh viễn bộ truyện này cùng toàn bộ chương. Thao tác này không thể hoàn tác.</p>
        {showDeleteConfirm ? (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger">
              {deleting ? 'Đang xóa…' : 'Xác nhận xóa vĩnh viễn'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary">
              Hủy
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn border border-red-500/40 text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" /> Xóa truyện
          </button>
        )}
      </div>
    </div>
  );
}
