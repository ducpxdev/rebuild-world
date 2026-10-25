/** Vietnamese date / number formatting shared across the UI. Timestamps are unix seconds. */

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function formatDate(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(ts: number | undefined): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('vi-VN');
}

/** "vừa xong", "5 phút trước", "3 ngày trước"… falling back to a date after a week (or `maxDays`). */
export function timeAgo(ts: number | undefined, maxDays = 7): string {
  if (!ts) return '—';
  const diff = nowSeconds() - ts;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  const days = Math.floor(diff / 86400);
  if (days < maxDays) return `${days} ngày trước`;
  if (maxDays > 30 && days < 365) return `${Math.floor(days / 30)} tháng trước`;
  if (maxDays > 365) return `${Math.floor(days / 365)} năm trước`;
  return formatDate(ts);
}

export function formatNumber(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString('vi-VN');
}

/** Compact form for stat tiles: 1,2K · 3,4Tr */
export function formatCompact(n: number | undefined | null): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}Tr`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}K`;
  return String(v);
}

/** True when the chapter was published within the last `days` days. */
export function isRecent(ts: number | undefined, days = 7): boolean {
  return !!ts && nowSeconds() - ts < days * 86400;
}
