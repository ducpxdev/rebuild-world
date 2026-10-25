import { useEffect, useState, useId } from 'react';
import { Eye, Star, BookOpen, Users, MessageCircle, TrendingUp } from 'lucide-react';
import api from '../lib/api';
import { formatCompact } from '../lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ViewPoint { view_date: string; views: number; }
interface ChapterStat { chapter_number: number; title: string; views: number; }
interface RatingPoint { week_start: string; avg_rating: number; count: number; }
interface FollowerPoint { week_start: string; count: number; }
interface Commenter { username: string; avatar_url?: string; comment_count: number; }

interface AnalyticsData {
  story: { id: string; title: string; views: number; rating_avg: number; chapter_count: number; };
  viewsOverTime: ViewPoint[];
  topChapters: ChapterStat[];
  ratingTrend: RatingPoint[];
  followersPerWeek: FollowerPoint[];
  topCommenters: Commenter[];
}

// ─── Chart primitives ─────────────────────────────────────────────────────────

/** Responsive SVG line / area chart. */
function LineChart({
  values,
  color,
  areaOpacity = 0.15,
  labelFirst,
  labelMid,
  labelLast,
}: {
  values: number[];
  color: string;
  areaOpacity?: number;
  labelFirst?: string;
  labelMid?: string;
  labelLast?: string;
}) {
  const gradId = useId();
  const W = 400;
  const H = 80;
  const PAD = { t: 6, r: 4, b: 20, l: 4 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const max = Math.max(...values, 1);
  const n = values.length;

  const pts = values.map((v, i) => ({
    x: PAD.l + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW),
    y: PAD.t + cH - (v / max) * cH,
  }));

  const poly = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area =
    pts.length > 1
      ? `M${pts[0].x.toFixed(1)},${(PAD.t + cH).toFixed(1)} ` +
        pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
        ` L${pts[n - 1].x.toFixed(1)},${(PAD.t + cH).toFixed(1)} Z`
      : '';

  const midPt = pts[Math.floor((n - 1) / 2)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-ink-500" style={{ height: H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={areaOpacity * 2} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradId})`} />}
      {pts.length > 1 && (
        <polyline
          points={poly}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Dot on last point */}
      {pts.length > 0 && (
        <circle cx={pts[n - 1].x} cy={pts[n - 1].y} r="3" fill={color} />
      )}
      {/* Axis labels */}
      {labelFirst && (
        <text x={PAD.l} y={H - 4} fontSize="9" fill="currentColor" textAnchor="start">{labelFirst}</text>
      )}
      {labelMid && midPt && (
        <text x={midPt.x} y={H - 4} fontSize="9" fill="currentColor" textAnchor="middle">{labelMid}</text>
      )}
      {labelLast && (
        <text x={W - PAD.r} y={H - 4} fontSize="9" fill="currentColor" textAnchor="end">{labelLast}</text>
      )}
    </svg>
  );
}

/** Horizontal bar chart (CSS). */
function HBarChart({
  rows,
  color,
  labelKey,
  valueKey,
  valueFormatter = (v: number) => String(v),
}: {
  rows: Record<string, unknown>[];
  color: string;
  labelKey: string;
  valueKey: string;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(...rows.map(r => Number(r[valueKey])), 1);
  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => {
        const val = Number(row[valueKey]);
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-28 text-xs text-ink-400 truncate shrink-0" title={String(row[labelKey])}>
              {String(row[labelKey])}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-5 bg-ink-900 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.75 }}
                />
              </div>
              <span className="text-xs text-ink-500 tabular-nums w-10 text-right shrink-0">
                {valueFormatter(val)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Vertical bar chart (CSS) — for weekly series. */
function VBarChart({
  values,
  labels,
  color,
}: {
  values: number[];
  labels: string[];
  color: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${labels[i]}: ${v}`}>
          <div
            className="w-full rounded-t transition-all duration-500"
            style={{ height: `${Math.max((v / max) * 64, v > 0 ? 3 : 0)}px`, backgroundColor: color, opacity: 0.7 }}
          />
          {labels.length <= 6 && (
            <span className="text-[9px] text-ink-500 rotate-0 truncate w-full text-center">
              {labels[i].slice(5)} {/* show MM-DD */}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return iso.slice(5); // MM-DD
}

const fmtNum = (n: number) => formatCompact(n);

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-ink-500 italic py-4 text-center">{text}</p>;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  storyId: string;
  storyTitle: string;
}

export default function StoryAnalytics({ storyId, storyTitle }: Props) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setData(null);
    api.get(`/users/me/analytics/${storyId}`)
      .then(r => setData(r.data))
      .catch(() => setError('Không thể tải dữ liệu thống kê.'))
      .finally(() => setLoading(false));
  }, [storyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-ink-500 gap-3">
        <div className="w-5 h-5 border-2 border-ink-700 border-t-primary-500 rounded-full animate-spin" />
        Đang tải thống kê…
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-center text-red-400 py-10 text-sm">{error || 'Không có dữ liệu.'}</p>;
  }

  const { story, viewsOverTime, topChapters, ratingTrend, followersPerWeek, topCommenters } = data;

  // Derived series for charts
  const viewValues = viewsOverTime.map(d => d.views);
  const viewDates = viewsOverTime.map(d => fmtDate(d.view_date));

  const ratingValues = ratingTrend.map(d => Number(d.avg_rating));
  const ratingDates = ratingTrend.map(d => fmtDate(d.week_start));

  const followerValues = followersPerWeek.map(d => Number(d.count));
  const followerDates = followersPerWeek.map(d => fmtDate(d.week_start));

  const totalViewsThisMonth = viewValues.reduce((a, b) => a + b, 0);
  const peakDay = viewsOverTime.reduce(
    (best, cur) => (cur.views > best.views ? cur : best),
    { view_date: '—', views: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Story header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary-400" />
        <h2 className="text-base font-semibold text-ink-200 font-display tracking-wide truncate">
          {storyTitle}
        </h2>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { icon: Eye, label: 'Tổng lượt xem', value: fmtNum(story.views), color: 'text-primary-400' },
          { icon: Eye, label: 'Lượt xem (30 ngày)', value: fmtNum(totalViewsThisMonth), color: 'text-primary-300' },
          { icon: Star, label: 'Đánh giá', value: story.rating_avg ? story.rating_avg.toFixed(2) : '—', color: 'text-amber-400' },
          { icon: BookOpen, label: 'Số chương', value: String(story.chapter_count), color: 'text-violet-400' },
          { icon: MessageCircle, label: 'Bình luận nhiều nhất', value: topCommenters[0]?.username ?? '—', color: 'text-emerald-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[10px] text-ink-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className={`text-lg font-bold font-display ${color} truncate`} title={value}>{value}</span>
          </div>
        ))}
      </div>

      {/* Views over time */}
      <Section title={`Lượt xem 30 ngày qua${peakDay.views > 0 ? ` · Cao nhất: ${peakDay.view_date.slice(5)} (${peakDay.views})` : ''}`}>
        {viewValues.every(v => v === 0) ? (
          <EmptyState text="Chưa có lượt xem nào trong 30 ngày qua." />
        ) : (
          <LineChart
            values={viewValues}
            color="#0ea5e9"
            labelFirst={viewDates[0]}
            labelMid={viewDates[Math.floor((viewDates.length - 1) / 2)]}
            labelLast={viewDates[viewDates.length - 1]}
          />
        )}
      </Section>

      {/* Middle row: Top chapters + Rating trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Chương được xem nhiều nhất">
          {topChapters.length === 0 ? (
            <EmptyState text="Chưa có chương nào." />
          ) : (
            <HBarChart
              rows={topChapters.map(c => ({
                label: `Chương ${c.chapter_number}${c.title ? ` — ${c.title}` : ''}`,
                views: c.views,
              }))}
              color="#0ea5e9"
              labelKey="label"
              valueKey="views"
              valueFormatter={fmtNum}
            />
          )}
        </Section>

        <Section title="Xu hướng đánh giá — 12 tuần qua">
          {ratingValues.length === 0 ? (
            <EmptyState text="Chưa có đánh giá nào trong 12 tuần qua." />
          ) : (
            <LineChart
              values={ratingValues}
              color="#f59e0b"
              areaOpacity={0.1}
              labelFirst={ratingDates[0]}
              labelMid={ratingDates[Math.floor((ratingDates.length - 1) / 2)]}
              labelLast={ratingDates[ratingDates.length - 1]}
            />
          )}
          {ratingValues.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-ink-500">
              <span>Thấp nhất <span className="text-ink-300">{Math.min(...ratingValues).toFixed(1)}</span></span>
              <span>Cao nhất <span className="text-ink-300">{Math.max(...ratingValues).toFixed(1)}</span></span>
              <span>Trung bình <span className="text-ink-300">
                {(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2)}
              </span></span>
            </div>
          )}
        </Section>
      </div>

      {/* Bottom row: New followers + Top commenters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section title="Người theo dõi mới mỗi tuần — 12 tuần qua">
          {followerValues.length === 0 ? (
            <EmptyState text="Không có người theo dõi mới trong 12 tuần qua." />
          ) : (
            <>
              <VBarChart values={followerValues} labels={followerDates} color="#a78bfa" />
              <div className="flex items-center gap-4 mt-2 text-xs text-ink-500">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Tổng <span className="text-ink-300 ml-1">{followerValues.reduce((a, b) => a + b, 0)}</span></span>
                <span>Tuần cao nhất <span className="text-ink-300">{Math.max(...followerValues)}</span></span>
              </div>
            </>
          )}
        </Section>

        <Section title="Độc giả bình luận tích cực nhất">
          {topCommenters.length === 0 ? (
            <EmptyState text="Chưa có bình luận nào." />
          ) : (
            <div className="space-y-2">
              {topCommenters.map((c, i) => (
                <div key={c.username} className="flex items-center gap-2.5">
                  <span className="text-xs text-ink-500 w-5 tabular-nums shrink-0">#{i + 1}</span>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.username} className="w-6 h-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-ink-800 flex items-center justify-center text-[10px] text-ink-400 font-bold shrink-0">
                      {c.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-xs text-ink-300 truncate">{c.username}</span>
                  <span className="text-xs text-emerald-400 tabular-nums shrink-0">
                    {c.comment_count} <span className="text-ink-500">bình luận</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
