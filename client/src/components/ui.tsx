import type { ReactNode } from 'react';
import { ImageIcon, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/** Shared presentational building blocks used across pages. */

export function Spinner({ className = '' }: { className?: string }) {
  return <div className={`spinner ${className}`} role="status" aria-label="Đang tải" />;
}

export function PageLoader({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[60vh] text-sm text-ink-500" aria-busy="true">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="card text-center px-6 py-14">
      {icon && <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-ink-900 text-ink-500 flex items-center justify-center">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink-200 font-display">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Marks a chapter that contains images or illustrations. */
export function ChapterImageIcon({ className = '' }: { className?: string }) {
  return (
    <span className={`chapter-img-icon ${className}`} title="Chương có hình minh họa" aria-label="Có hình minh họa" role="img">
      <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  );
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
  return (
    <button type="button" onClick={toggleTheme} className={`btn-icon ${className}`} title={label} aria-label={label}>
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export function Alert({ kind, children, className = '' }: { kind: 'error' | 'success' | 'warning' | 'info'; children: ReactNode; className?: string }) {
  const styles = {
    error: 'bg-red-500/10 text-red-400 border-red-500/25',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    info: 'bg-primary-500/10 text-primary-300 border-primary-500/25',
  }[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${styles} ${className}`}>
      {children}
    </div>
  );
}
