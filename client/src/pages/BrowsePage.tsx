import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoryCard from '../components/StoryCard';
import { EmptyState } from '../components/ui';
import api from '../lib/api';
import { GENRES, genreLabel } from '../lib/i18n';
import { formatNumber } from '../lib/format';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, BookOpen, Image, LayoutGrid } from 'lucide-react';

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; author_name: string; views: number; likes: number;
  chapter_count: number; status?: string; tags?: string; rating_avg?: number;
}

const SORTS = [
  { value: 'latest', label: 'Mới cập nhật' },
  { value: 'popular', label: 'Xem nhiều nhất' },
  { value: 'rated', label: 'Đánh giá cao' },
  { value: 'oldest', label: 'Cũ nhất' },
];

const TYPES = [
  { value: '', label: 'Tất cả', icon: LayoutGrid },
  { value: 'text', label: 'Truyện chữ', icon: BookOpen },
  { value: 'comic', label: 'Truyện tranh', icon: Image },
];

/** Page numbers to show: first, last and a window around the current page. */
function pageWindow(current: number, total: number): Array<number | '…'> {
  const pages = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const type = params.get('type') || '';
  const sort = params.get('sort') || 'latest';
  const page = Number(params.get('page') || 1);
  const [searchText, setSearchText] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);

  // Keep the box in sync when the query changes from elsewhere (e.g. the navbar search)
  if (q !== syncedQ) {
    setSyncedQ(q);
    setSearchText(q);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFailed(false);
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (genre) sp.set('genre', genre);
    if (type) sp.set('type', type);
    sp.set('sort', sort);
    sp.set('page', String(page));

    api.get(`/stories?${sp.toString()}`).then(r => {
      setStories(r.data.stories);
      setTotal(r.data.total);
      setPages(r.data.pages);
    }).catch(() => setFailed(true)).finally(() => setLoading(false));
  }, [q, genre, type, sort, page, reloadKey]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setParams(next);
    if (key === 'page') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => setParams(new URLSearchParams({ sort }));
  const hasFilters = !!(q || genre || type);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="section-title text-3xl">Khám phá truyện</h1>
        <p className="text-ink-500 mt-1">Tìm kiếm theo tên, lọc theo loại truyện và thể loại.</p>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-5 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={e => { e.preventDefault(); updateParam('q', searchText.trim()); }}
          >
            <label htmlFor="browse-search" className="sr-only">Tìm kiếm</label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500 pointer-events-none" />
            <input
              id="browse-search"
              type="search"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Tìm theo tên truyện hoặc mô tả… (nhấn Enter)"
              className="input pl-10 pr-10"
            />
            {searchText && (
              <button type="button" onClick={() => { setSearchText(''); updateParam('q', ''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-ink-500 hover:text-ink-200" aria-label="Xóa từ khóa">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <div className="flex items-center gap-2">
            <label htmlFor="browse-sort" className="text-sm text-ink-500 shrink-0">Sắp xếp</label>
            <select id="browse-sort" value={sort} onChange={e => updateParam('sort', e.target.value)} className="input sm:w-48">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Loại truyện">
          {TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => updateParam('type', t.value)} aria-pressed={type === t.value} className="chip">
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Thể loại
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" role="group" aria-label="Thể loại">
            <button type="button" onClick={() => updateParam('genre', '')} aria-pressed={!genre} className="chip">Tất cả</button>
            {GENRES.map(g => (
              <button key={g} type="button" onClick={() => updateParam('genre', genre === g ? '' : g)} aria-pressed={genre === g} className="chip">
                {genreLabel(g)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result summary */}
      {!loading && !failed && (
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <span className="text-ink-400">
            Tìm thấy <strong className="text-ink-100">{formatNumber(total)}</strong> truyện
            {q && <> cho “<span className="text-ink-100">{q}</span>”</>}
          </span>
          {hasFilters && (
            <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm">
              <X className="w-4 h-4" /> Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface overflow-hidden">
              <div className="skeleton aspect-[3/4] !rounded-none" />
              <div className="p-3 space-y-2"><div className="skeleton h-3.5 w-4/5" /><div className="skeleton h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : failed ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="Không thể tải danh sách truyện"
          description="Vui lòng kiểm tra kết nối mạng và thử lại."
          action={<button type="button" className="btn btn-primary" onClick={() => setReloadKey(k => k + 1)}>Thử lại</button>}
        />
      ) : stories.length === 0 ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="Không tìm thấy truyện phù hợp"
          description="Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc."
          action={hasFilters ? <button type="button" className="btn btn-secondary" onClick={clearAll}>Xóa bộ lọc</button> : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {stories.map(s => <StoryCard key={s.id} {...s} />)}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <nav className="flex justify-center items-center gap-1.5 mt-10" aria-label="Phân trang">
              <button type="button" onClick={() => updateParam('page', String(page - 1))} disabled={page <= 1} className="btn btn-secondary btn-sm !px-2.5" aria-label="Trang trước">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {pageWindow(page, pages).map((p, i) => p === '…' ? (
                <span key={`gap-${i}`} className="px-1 text-ink-500">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateParam('page', String(p))}
                  aria-current={p === page ? 'page' : undefined}
                  className={`btn btn-sm min-w-10 ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p}
                </button>
              ))}
              <button type="button" onClick={() => updateParam('page', String(page + 1))} disabled={page >= pages} className="btn btn-secondary btn-sm !px-2.5" aria-label="Trang sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
