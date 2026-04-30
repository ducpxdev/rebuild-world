import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import StoryCard from '../components/StoryCard';
import api from '../lib/api';
import { Search, SlidersHorizontal } from 'lucide-react';

const GENRES = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure', 'Mystery', 'Comedy', 'Drama', 'Slice of Life', 'Action'];

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; author_name: string; views: number; likes: number;
  chapter_count: number; status?: string;
}

export default function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const q = params.get('q') || '';
  const genre = params.get('genre') || '';
  const type = params.get('type') || '';
  const sort = params.get('sort') || 'latest';
  const page = Number(params.get('page') || 1);

  useEffect(() => {
    setLoading(true);
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
    }).catch(() => {}).finally(() => setLoading(false));
  }, [q, genre, type, sort, page]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    next.set('page', '1');
    setParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-6 font-['Rajdhani'] tracking-wide">Browse Archives</h1>

      {/* Filters */}
      <div className="bg-[#12121e] rounded-xl border border-slate-800/60 p-5 mb-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input type="text" defaultValue={q} placeholder="Search..." onKeyDown={e => { if (e.key === 'Enter') updateParam('q', (e.target as HTMLInputElement).value); }}
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-300 placeholder-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition" />
          </div>
          {/* Type */}
          <select value={type} onChange={e => updateParam('type', e.target.value)}
            className="py-2 px-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-400 focus:border-cyan-500/50 outline-none">
            <option value="">All Types</option>
            <option value="text">Text Stories</option>
            <option value="comic">Comics</option>
          </select>
          {/* Genre */}
          <select value={genre} onChange={e => updateParam('genre', e.target.value)}
            className="py-2 px-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-400 focus:border-cyan-500/50 outline-none">
            <option value="">All Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          {/* Sort */}
          <select value={sort} onChange={e => updateParam('sort', e.target.value)}
            className="py-2 px-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-400 focus:border-cyan-500/50 outline-none">
            <option value="latest">Latest</option>
            <option value="popular">Most Viewed</option>
            <option value="rated">Highest Rated</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <p className="text-lg font-medium text-slate-400">No stories found</p>
          <p className="text-sm">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">{total} stories found</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {stories.map(s => <StoryCard key={s.id} {...s} />)}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => updateParam('page', String(p))}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${p === page ? 'bg-cyan-500 text-black font-bold' : 'bg-[#12121e] border border-slate-800/60 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
