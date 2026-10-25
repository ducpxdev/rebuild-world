import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { BookOpen, Image } from 'lucide-react';
import { apiErrorMessage } from '../lib/i18n';
import { Alert } from '../components/ui';
import { GenrePicker, CategoryPicker, CoverPicker } from '../components/StoryFormFields';

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

  const handleCover = (file: File) => {
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Vui lòng nhập tên truyện');
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
      setError(apiErrorMessage(err, 'Không thể tạo truyện'));
    } finally {
      setLoading(false);
    }
  };

  const typeBtn = (active: boolean) =>
    `flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition text-center ${active ? 'border-primary-500 bg-primary-500/5' : 'border-line hover:border-primary-500/40'}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="section-title text-3xl">Tạo truyện mới</h1>
      <p className="text-ink-500 mt-1 mb-8">Điền thông tin cơ bản, bạn có thể thêm tập và chương sau.</p>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-7">
        {error && <Alert kind="error">{error}</Alert>}

        {/* Type selector */}
        <fieldset>
          <legend className="label">Loại truyện</legend>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button type="button" onClick={() => { setType('text'); setSelectedTags([]); }} aria-pressed={type === 'text'} className={typeBtn(type === 'text')}>
              <BookOpen className={`w-9 h-9 ${type === 'text' ? 'text-primary-400' : 'text-ink-500'}`} />
              <div>
                <span className={`font-semibold ${type === 'text' ? 'text-primary-300' : 'text-ink-300'}`}>Truyện chữ</span>
                <p className="text-xs text-ink-500 mt-1">Các chương viết bằng văn bản</p>
              </div>
            </button>
            <button type="button" onClick={() => { setType('comic'); setSelectedTags([]); }} aria-pressed={type === 'comic'} className={typeBtn(type === 'comic')}>
              <Image className={`w-9 h-9 ${type === 'comic' ? 'text-primary-400' : 'text-ink-500'}`} />
              <div>
                <span className={`font-semibold ${type === 'comic' ? 'text-primary-300' : 'text-ink-300'}`}>Truyện tranh / Manga</span>
                <p className="text-xs text-ink-500 mt-1">Các chương gồm hình ảnh</p>
              </div>
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor="story-title" className="label">Tên truyện <span className="text-red-400">*</span></label>
          <input id="story-title" type="text" required value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Đặt tên cho bộ truyện" />
        </div>

        <div>
          <label htmlFor="story-desc" className="label">Giới thiệu</label>
          <textarea id="story-desc" value={description} onChange={e => setDescription(e.target.value)} rows={5} className="input resize-y" placeholder="Bộ truyện kể về điều gì?" />
        </div>

        <CoverPicker preview={coverPreview} onFile={handleCover} onClear={() => { setCover(null); setCoverPreview(''); }} />

        <GenrePicker value={genres} onChange={setGenres} />

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="story-author" className="label">Tác giả</label>
            <input id="story-author" type="text" value={workAuthorName} onChange={e => setWorkAuthorName(e.target.value)} className="input" placeholder="Tên tác giả gốc" />
          </div>
          <div>
            <label htmlFor="story-illustrator" className="label">Họa sĩ minh họa</label>
            <input id="story-illustrator" type="text" value={illustratorName} onChange={e => setIllustratorName(e.target.value)} className="input" placeholder="Không bắt buộc" />
          </div>
          <div>
            <label htmlFor="story-translator" className="label">Dịch giả</label>
            <input id="story-translator" type="text" value={translatorName} onChange={e => setTranslatorName(e.target.value)} className="input" placeholder="Không bắt buộc" />
          </div>
        </div>

        <CategoryPicker type={type} value={selectedTags} onChange={setSelectedTags} />

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
          {loading ? 'Đang tạo…' : 'Tạo truyện'}
        </button>
      </form>
    </div>
  );
}
