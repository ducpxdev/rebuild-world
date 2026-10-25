import { useCallback, useState } from 'react';

/**
 * Reader display preferences for the chapter page.
 * Persisted per-device in localStorage; every read/write is guarded because
 * storage can be unavailable (private browsing, blocked site data).
 */

export type ReaderTheme = 'auto' | 'paper' | 'sepia' | 'night' | 'black';
export type ReaderFont = 'sans' | 'serif' | 'classic';
export type ReaderWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type ReaderAlign = 'left' | 'justify';
export type ReaderSpacing = 'compact' | 'normal' | 'relaxed';

export interface ReaderPrefs {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;   // px
  lineHeight: number; // unitless multiplier
  width: ReaderWidth;
  align: ReaderAlign;
  spacing: ReaderSpacing; // gap between paragraphs
  indent: boolean;        // first-line indent
}

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  theme: 'auto',
  font: 'sans',
  fontSize: 18,
  lineHeight: 1.8,
  width: 'medium',
  align: 'left',
  spacing: 'normal',
  indent: false,
};

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 28;
export const LINE_HEIGHTS = [1.5, 1.65, 1.8, 2.0, 2.2];

export interface ReaderThemeColors {
  label: string;
  zoneBg: string;   // background of the full-width reading zone
  paperBg: string;  // the article "page"
  border: string;
  text: string;
  heading: string;
  muted: string;
  accent: string;
  /** Swatch shown in the settings panel */
  swatch: string;
}

export const READER_THEMES: Record<ReaderTheme, ReaderThemeColors> = {
  // Follows the site's light/dark theme (values come from CSS variables in index.css)
  auto: {
    label: 'Tự động',
    zoneBg: 'var(--reader-zone)',
    paperBg: 'var(--reader-paper)',
    border: 'var(--reader-border)',
    text: 'var(--reader-text)',
    heading: 'var(--reader-heading)',
    muted: 'var(--reader-muted)',
    accent: 'var(--reader-accent)',
    swatch: 'linear-gradient(135deg, #ffffff 0 50%, #121722 50% 100%)',
  },
  paper: {
    label: 'Trắng',
    zoneBg: '#e7e7e2',
    paperBg: '#fbfbf8',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#2b2b2b',
    heading: '#111111',
    muted: '#6f6f6f',
    accent: '#0e7490',
    swatch: '#fbfbf8',
  },
  sepia: {
    label: 'Giấy ngà',
    zoneBg: '#e8dcc0',
    paperBg: '#f4ecd8',
    border: 'rgba(160, 130, 90, 0.3)',
    text: '#4a3a2a',
    heading: '#2e2216',
    muted: '#7d6649',
    accent: '#a0522d',
    swatch: '#f4ecd8',
  },
  night: {
    label: 'Đêm',
    zoneBg: '#0a0a12',
    paperBg: '#12121e',
    border: 'rgba(30, 41, 59, 0.6)',
    text: '#cbd5e1',
    heading: '#f1f5f9',
    muted: '#7d8aa0',
    accent: '#38bdf8',
    swatch: '#12121e',
  },
  black: {
    label: 'Đen',
    zoneBg: '#000000',
    paperBg: '#050507',
    border: 'rgba(39, 39, 42, 0.8)',
    text: '#b4b8c2',
    heading: '#e4e6eb',
    muted: '#6f7584',
    accent: '#38bdf8',
    swatch: '#000000',
  },
};

export const READER_FONTS: Record<ReaderFont, { label: string; family: string }> = {
  sans: { label: 'Không chân', family: "'Inter', system-ui, -apple-system, sans-serif" },
  serif: { label: 'Có chân', family: "'Literata', 'Noto Serif', Georgia, serif" },
  classic: { label: 'Cổ điển', family: "'Noto Serif', Georgia, 'Times New Roman', Times, serif" },
};

export const READER_WIDTHS: Record<ReaderWidth, { label: string; maxWidth: string }> = {
  narrow: { label: 'Hẹp', maxWidth: '42rem' },
  medium: { label: 'Vừa', maxWidth: '50rem' },
  wide: { label: 'Rộng', maxWidth: '60rem' },
  full: { label: 'Tối đa', maxWidth: '72rem' }, // matches the original max-w-6xl layout
};

export const READER_SPACINGS: Record<ReaderSpacing, { label: string; gap: string }> = {
  compact: { label: 'Gọn', gap: '0.6em' },
  normal: { label: 'Vừa', gap: '1em' },
  relaxed: { label: 'Thoáng', gap: '1.5em' },
};

const STORAGE_KEY = 'rw_reader_prefs';

const isOneOf = <T extends string>(value: unknown, options: Record<T, unknown>): value is T =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(options, value);

/** Validate stored data field-by-field so a corrupt or outdated entry never breaks the reader. */
function sanitize(raw: unknown): ReaderPrefs {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_READER_PREFS;
  const fontSize = typeof p.fontSize === 'number' && p.fontSize >= FONT_SIZE_MIN && p.fontSize <= FONT_SIZE_MAX
    ? Math.round(p.fontSize) : d.fontSize;
  const lineHeight = typeof p.lineHeight === 'number' && LINE_HEIGHTS.includes(p.lineHeight)
    ? p.lineHeight : d.lineHeight;
  return {
    theme: isOneOf(p.theme, READER_THEMES) ? p.theme : d.theme,
    font: isOneOf(p.font, READER_FONTS) ? p.font : d.font,
    width: isOneOf(p.width, READER_WIDTHS) ? p.width : d.width,
    align: p.align === 'justify' ? 'justify' : 'left',
    spacing: isOneOf(p.spacing, READER_SPACINGS) ? p.spacing : d.spacing,
    indent: typeof p.indent === 'boolean' ? p.indent : d.indent,
    fontSize,
    lineHeight,
  };
}

function loadPrefs(): ReaderPrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? sanitize(JSON.parse(saved)) : DEFAULT_READER_PREFS;
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs);

  const updatePrefs = useCallback((patch: Partial<ReaderPrefs>) => {
    setPrefs(prev => {
      const next = sanitize({ ...prev, ...patch });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable — preferences still apply for this session
      }
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefs(DEFAULT_READER_PREFS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return { prefs, updatePrefs, resetPrefs };
}
