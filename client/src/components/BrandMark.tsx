import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';

/** Site logo + wordmark. `compact` hides the wordmark on small screens. */
export default function BrandMark({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 shrink-0 group ${className}`} aria-label="Rebuild World — Trang chủ">
      <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
        <Crosshair className="w-5 h-5" />
      </span>
      <span className={`${compact ? 'hidden sm:inline' : ''} font-display font-extrabold text-lg tracking-tight text-ink-100`}>
        Rebuild<span className="text-primary-400"> World</span>
      </span>
    </Link>
  );
}
