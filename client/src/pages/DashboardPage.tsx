import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PenTool, Eye, Star, BookOpen, Plus, Settings, Bookmark, Image } from 'lucide-react';

interface MyStory {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; status?: string; views: number; rating_avg: number;
  rating_count: number; chapter_count: number; is_published: number; updated_at: number;
}

interface BookmarkItem {
  id: string; title: string; cover_url?: string; type: string;
  author_name: string; chapter_count: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'stories' | 'bookmarks'>('stories');
  const [stories, setStories] = useState<MyStory[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  useEffect(() => {
    api.get('/users/me/stories').then(r => setStories(r.data));
    api.get('/users/me/bookmarks').then(r => setBookmarks(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {user?.username}!</p>
        </div>
        <Link to="/create" className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-[0_0_15px_rgba(0,212,255,0.2)] font-['Rajdhani'] tracking-wide uppercase">
          <Plus className="w-4 h-4" /> New Story
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 w-fit mb-8 border border-slate-800/60">
        <button onClick={() => setTab('stories')}
          className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition ${tab === 'stories' ? 'bg-[#12121e] text-cyan-400 shadow-sm border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
          <PenTool className="w-4 h-4" /> My Stories ({stories.length})
        </button>
        <button onClick={() => setTab('bookmarks')}
          className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition ${tab === 'bookmarks' ? 'bg-[#12121e] text-cyan-400 shadow-sm border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
          <Bookmark className="w-4 h-4" /> Bookmarks ({bookmarks.length})
        </button>
      </div>

      {tab === 'stories' && (
        stories.length === 0 ? (
          <div className="text-center py-20 bg-[#12121e] rounded-xl border border-slate-800/60">
            <PenTool className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No stories yet</h3>
            <p className="text-slate-600 mb-6">Start your creative journey by writing your first story!</p>
            <Link to="/create" className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition font-['Rajdhani'] tracking-wide uppercase">
              <Plus className="w-4 h-4" /> Create Story
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {stories.map(s => (
              <div key={s.id} className="bg-[#12121e] rounded-xl border border-slate-800/60 p-4 flex items-center gap-4 hover:border-cyan-500/20 transition">
                <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : s.type === 'comic' ? (
                    <Image className="w-6 h-6 text-slate-700" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-slate-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/story/${s.id}`} className="font-semibold text-slate-200 hover:text-cyan-400 transition truncate">{s.title}</Link>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.type === 'comic' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{s.type}</span>
                    {!s.is_published && <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-500">Draft</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{s.views}</span>
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{s.rating_avg ? s.rating_avg.toFixed(1) : '—'} ({s.rating_count})</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{s.chapter_count} chapters</span>
                    <span>{new Date(s.updated_at * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/story/${s.id}/add-chapter`} className="flex items-center gap-1 px-3 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/20 border border-cyan-500/20 transition">
                    <Plus className="w-3.5 h-3.5" /> Chapter
                  </Link>
                  <Link to={`/story/${s.id}/edit`} className="p-2 text-slate-600 hover:text-cyan-400 transition">
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'bookmarks' && (
        bookmarks.length === 0 ? (
          <div className="text-center py-20 bg-[#12121e] rounded-xl border border-slate-800/60">
            <Bookmark className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400 mb-2">No bookmarks yet</h3>
            <p className="text-slate-600">Browse stories and bookmark your favorites!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {bookmarks.map(b => (
              <Link key={b.id} to={`/story/${b.id}`} className="bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,212,255,0.05)] transition">
                <div className="aspect-[3/4] bg-gradient-to-br from-slate-900 to-slate-800">
                  {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-slate-200 truncate">{b.title}</h3>
                  <p className="text-xs text-slate-500">{b.author_name} · {b.chapter_count} ch</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
