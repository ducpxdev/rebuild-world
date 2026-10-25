import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Clock, Compass, Flame, History, Search, Sparkles, Image } from 'lucide-react';
import StoryCard from '../components/StoryCard';
import { ChapterImageIcon } from '../components/ui';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getRecentProgress, type RecentProgress } from '../lib/readingProgress';
import { timeAgo, isRecent } from '../lib/format';
import { typeLabel } from '../lib/i18n';

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; author_name: string; views: number; rating_avg?: number;
  rating_count?: number; chapter_count: number; status?: string; tags?: string;
}

interface StoryWithChapters extends Story {
  chapters?: Array<{ id: string; chapter_number: number; title: string; views: number; created_at: number; volume_id?: string; has_images?: boolean }>;
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="skeleton aspect-[3/4] !rounded-none" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3.5 w-4/5" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, to }: { icon: React.ReactNode; title: string; subtitle?: string; to?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center shrink-0">{icon}</span>
        <div>
          <h2 className="section-title text-xl md:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className="btn btn-ghost btn-sm shrink-0">
          Xem tất cả <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Story[]>([]);
  const [latest, setLatest] = useState<StoryWithChapters[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [recent] = useState<RecentProgress[]>(() => getRecentProgress(4));

  useEffect(() => {
    const loadStories = async () => {
      try {
        // Fetch featured stories
        const featuredRes = await api.get('/stories?sort=popular&page=1');
        setFeatured(featuredRes.data.stories?.slice(0, 6) ?? []);

        // Fetch latest story summaries
        const latestRes = await api.get('/stories?sort=latest&page=1');
        const latestStories = latestRes.data.stories?.slice(0, 8) ?? [];

        // Fetch detailed data (with chapters) for each latest story
        const detailedStories = await Promise.all(
          latestStories.map(async (story: Story) => {
            try {
              const detailRes = await api.get(`/stories/${story.id}`);
              return detailRes.data;
            } catch {
              return story;
            }
          })
        );

        setLatest(detailedStories);
      } catch (error) {
        console.error('Error loading stories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStories();
  }, []);

  // Older progress entries don't carry the story title — fill it in from the loaded lists
  const knownStories = new Map<string, Story>([...featured, ...latest].map(s => [s.id, s]));
  const continueItems = recent
    .map(p => {
      const s = knownStories.get(p.storyId);
      return { ...p, storyTitle: p.storyTitle || s?.title, coverUrl: p.coverUrl || s?.cover_url };
    })
    .filter(p => p.storyTitle);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/15 via-canvas to-indigo-500/10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="max-w-2xl animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface/80 border border-line text-xs font-semibold text-primary-300 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" /> Light novel · Web novel · Manga
            </span>
            <h1 className="mt-5 text-4xl md:text-5xl font-extrabold text-ink-50 tracking-tight leading-[1.15]">
              Đọc <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-indigo-400">Rebuild World</span> bằng tiếng Việt
            </h1>
            <p className="mt-4 text-base md:text-lg text-ink-400 leading-relaxed">
              Hành trình sinh tồn giữa tàn tích của một nền văn minh đã sụp đổ. Đọc truyện chữ, truyện tranh và lưu lại tiến độ để tiếp tục bất cứ lúc nào.
            </p>
            <form onSubmit={onSearch} role="search" className="mt-7 flex gap-2 max-w-lg">
              <label htmlFor="hero-search" className="sr-only">Tìm truyện</label>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 pointer-events-none" />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Nhập tên truyện…"
                  className="input !min-h-12 pl-12 !rounded-xl"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg">Tìm</button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/browse" className="chip"><Compass className="w-4 h-4" /> Khám phá tất cả</Link>
              <Link to="/browse?type=text" className="chip"><BookOpen className="w-4 h-4" /> Truyện chữ</Link>
              <Link to="/browse?type=comic" className="chip"><Image className="w-4 h-4" /> Truyện tranh</Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 py-12">
        {/* Continue reading */}
        {continueItems.length > 0 && (
          <section aria-label="Tiếp tục đọc">
            <SectionHeader icon={<History className="w-5 h-5" />} title="Tiếp tục đọc" subtitle="Quay lại đúng chỗ bạn đã dừng" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {continueItems.map(item => {
                const pct = Math.round((item.scrollPct ?? 0) * 100);
                return (
                  <Link
                    key={item.storyId}
                    to={`/story/${item.storyId}/chapter/${item.chapterNumber}`}
                    className="group card flex gap-3 p-3 hover:border-primary-500/40 transition"
                  >
                    <div className="w-14 h-20 rounded-lg overflow-hidden bg-ink-900 shrink-0">
                      {item.coverUrl ? <img src={item.coverUrl} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-6 h-6 m-auto mt-7 text-ink-600" />}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <p className="text-sm font-semibold text-ink-100 line-clamp-1 group-hover:text-primary-300 transition">{item.storyTitle}</p>
                      <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">Chương {item.chapterNumber}{item.title ? ` · ${item.title}` : ''}</p>
                      <div className="mt-auto">
                        <div className="flex justify-between text-[11px] text-ink-500 mb-1">
                          <span>{timeAgo(Math.floor(item.updatedAt / 1000))}</span>
                          <span className="tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink-900 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Popular Stories */}
        <section aria-label="Truyện nổi bật">
          <SectionHeader icon={<Flame className="w-5 h-5" />} title="Truyện nổi bật" subtitle="Được đọc nhiều nhất" to="/browse?sort=popular" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {loading
              ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)
              : featured.map(s => <StoryCard key={s.id} {...s} />)}
          </div>
          {!loading && featured.length === 0 && (
            <p className="text-center text-ink-500 py-10">Chưa có truyện nào được đăng.</p>
          )}
        </section>

        {/* Latest updates */}
        {(loading || latest.length > 0) && (
          <section aria-label="Mới cập nhật">
            <SectionHeader icon={<Clock className="w-5 h-5" />} title="Mới cập nhật" subtitle="Chương mới nhất từ các bộ truyện" to="/browse?sort=latest" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading
                ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="card p-3 flex gap-4">
                    <div className="skeleton w-20 h-28 shrink-0" />
                    <div className="flex-1 space-y-2.5 py-1"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /></div>
                  </div>
                ))
                : latest.map(s => {
                  const recentChapters = (s.chapters ?? []).slice(-3).reverse();
                  return (
                    <article key={s.id} className="card p-3 flex gap-4 hover:border-primary-500/30 transition">
                      <Link to={`/story/${s.id}`} className="w-20 h-28 rounded-xl overflow-hidden bg-ink-900 shrink-0">
                        {s.cover_url
                          ? <img src={s.cover_url} alt={s.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-7 h-7 text-ink-600" /></div>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/story/${s.id}`} className="min-w-0 font-semibold text-ink-100 hover:text-primary-300 transition line-clamp-1">{s.title}</Link>
                          <span className="badge bg-ink-900 text-ink-400 shrink-0">{typeLabel(s.type)}</span>
                        </div>
                        <p className="text-xs text-ink-500 mt-0.5">{s.author_name} · {s.chapter_count} chương</p>
                        <ul className="mt-2 space-y-0.5">
                          {recentChapters.length === 0 && <li className="text-xs text-ink-500 italic">Chưa có chương nào</li>}
                          {recentChapters.map(ch => (
                            <li key={ch.id}>
                              <Link to={`/story/${s.id}/chapter/${ch.chapter_number}`} className="group flex items-center gap-2 py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-ink-900 transition text-sm">
                                {s.type !== 'comic' && ch.has_images && <ChapterImageIcon />}
                                <span className="flex-1 min-w-0 truncate text-ink-300 group-hover:text-primary-300 transition">{ch.title}</span>
                                {isRecent(ch.created_at) && <span className="badge bg-rose-500/12 text-rose-500">Mới</span>}
                                <span className="text-[11px] text-ink-500 shrink-0 tabular-nums">{timeAgo(ch.created_at, 30)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}

        {/* CTA */}
        {!user && (
          <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-primary-600 to-indigo-600 px-6 py-12 md:px-12 text-center text-white">
            <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <h2 className="relative text-2xl md:text-3xl font-bold">Tham gia cộng đồng độc giả</h2>
            <p className="relative mt-3 text-white/85 max-w-xl mx-auto">
              Tạo tài khoản để lưu truyện yêu thích, bình luận, đánh giá và nhận thông báo khi có chương mới.
            </p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn btn-lg bg-white text-primary-700 hover:bg-white/90">
                Đăng ký miễn phí <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn btn-lg border border-white/40 text-white hover:bg-white/10">Đăng nhập</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
