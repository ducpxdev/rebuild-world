import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { PenTool, Eye, Star, BookOpen, Plus, Settings, Bookmark, Image, BarChart2 } from 'lucide-react';
import StoryAnalytics from '../components/StoryAnalytics';
import { EmptyState } from '../components/ui';
import { formatDate, formatCompact } from '../lib/format';
import { typeLabel } from '../lib/i18n';

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
  const [tab, setTab] = useState<'stories' | 'bookmarks' | 'analytics'>('stories');
  const [stories, setStories] = useState<MyStory[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [analyticsStoryId, setAnalyticsStoryId] = useState<string>('');

  useEffect(() => {
    api.get('/users/me/stories').then(r => setStories(r.data));
    api.get('/users/me/bookmarks').then(r => setBookmarks(r.data));
  }, []);

  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 px-4 min-h-10 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
      active ? 'bg-surface text-primary-300 shadow-sm ring-1 ring-line' : 'text-ink-500 hover:text-ink-200'
    }`;

  const createButton = (
    <Link to="/create" className="btn btn-primary">
      <Plus className="w-4 h-4" /> Tạo truyện
    </Link>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title text-3xl">Bảng điều khiển</h1>
          <p className="text-ink-500 mt-1">Chào mừng trở lại, {user?.username}!</p>
        </div>
        <Link to="/create" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Truyện mới
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-900 rounded-xl p-1 w-fit max-w-full overflow-x-auto no-scrollbar mb-8" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'stories'} onClick={() => setTab('stories')} className={tabBtn(tab === 'stories')}>
          <PenTool className="w-4 h-4" /> Truyện của tôi ({stories.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'bookmarks'} onClick={() => setTab('bookmarks')} className={tabBtn(tab === 'bookmarks')}>
          <Bookmark className="w-4 h-4" /> Đã lưu ({bookmarks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'analytics'}
          onClick={() => {
            setTab('analytics');
            if (!analyticsStoryId && stories.length > 0) setAnalyticsStoryId(stories[0].id);
          }}
          className={tabBtn(tab === 'analytics')}>
          <BarChart2 className="w-4 h-4" /> Thống kê
        </button>
      </div>

      {tab === 'stories' && (
        stories.length === 0 ? (
          <EmptyState
            icon={<PenTool className="w-7 h-7" />}
            title="Bạn chưa có truyện nào"
            description="Bắt đầu hành trình sáng tác bằng bộ truyện đầu tiên!"
            action={createButton}
          />
        ) : (
          <div className="space-y-3">
            {stories.map(s => (
              <div key={s.id} className="card p-3 sm:p-4 flex items-center gap-4 hover:border-primary-500/30 transition">
                <div className="w-14 h-20 rounded-lg bg-ink-900 flex items-center justify-center shrink-0 overflow-hidden">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : s.type === 'comic' ? (
                    <Image className="w-6 h-6 text-ink-600" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-ink-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link to={`/story/${s.id}`} className="font-semibold text-ink-100 hover:text-primary-300 transition truncate">{s.title}</Link>
                    <span className={`badge ${s.type === 'comic' ? 'bg-orange-500/10 text-orange-400' : 'bg-primary-500/10 text-primary-300'}`}>{typeLabel(s.type)}</span>
                    {!s.is_published && <span className="badge bg-ink-900 text-ink-500">Bản nháp</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                    <span className="flex items-center gap-1" title="Lượt xem"><Eye className="w-3.5 h-3.5" />{formatCompact(s.views)}</span>
                    <span className="flex items-center gap-1" title="Đánh giá"><Star className="w-3.5 h-3.5 text-amber-500" />{s.rating_avg ? s.rating_avg.toFixed(1) : '—'} ({s.rating_count})</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{s.chapter_count} chương</span>
                    <span>Cập nhật {formatDate(s.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <Link to={`/story/${s.id}/add-chapter`} className="btn btn-soft btn-sm" title="Thêm chương">
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Chương</span>
                  </Link>
                  <Link to={`/story/${s.id}/edit`} className="btn-icon" title="Sửa truyện" aria-label="Sửa truyện">
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
          <EmptyState
            icon={<Bookmark className="w-7 h-7" />}
            title="Chưa có truyện nào được lưu"
            description="Khám phá và lưu những bộ truyện bạn yêu thích!"
            action={<Link to="/browse" className="btn btn-primary">Khám phá truyện</Link>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {bookmarks.map(b => (
              <Link key={b.id} to={`/story/${b.id}`} className="group card overflow-hidden !rounded-2xl hover:border-primary-500/40 hover:-translate-y-0.5 transition">
                <div className="aspect-[3/4] bg-ink-900 overflow-hidden">
                  {b.cover_url && <img src={b.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-ink-100 truncate group-hover:text-primary-300 transition">{b.title}</h3>
                  <p className="text-xs text-ink-500 truncate">{b.author_name} · {b.chapter_count} chương</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === 'analytics' && (
        stories.length === 0 ? (
          <EmptyState
            icon={<BarChart2 className="w-7 h-7" />}
            title="Bạn chưa có truyện nào"
            description="Hãy tạo truyện để bắt đầu xem thống kê."
            action={createButton}
          />
        ) : (
          <div className="space-y-6">
            {/* Story selector */}
            {stories.length > 1 && (
              <div className="flex items-center gap-3">
                <label htmlFor="analytics-story" className="text-sm text-ink-500 shrink-0">Truyện:</label>
                <select
                  id="analytics-story"
                  value={analyticsStoryId}
                  onChange={e => setAnalyticsStoryId(e.target.value)}
                  className="input max-w-sm"
                >
                  {stories.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}
            {analyticsStoryId && (
              <StoryAnalytics
                key={analyticsStoryId}
                storyId={analyticsStoryId}
                storyTitle={stories.find(s => s.id === analyticsStoryId)?.title ?? ''}
              />
            )}
          </div>
        )
      )}
    </div>
  );
}
