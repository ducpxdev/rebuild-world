import { useCallback, useState } from 'react';

/**
 * Reader display preferences for the chapter page.
 * Persisted per-device in localStorage; every read/write is guarded because
 * storage can be unavailable (private browsing, blocked site data).
 */

export type ReaderTheme = 'night' | 'black' | 'sepia' | 'paper';
export type ReaderFont = 'sans' | 'serif' | 'classic';
export type ReaderWidth = 'narrow' | 'medium' | 'wide';
export type ReaderAlign = 'left' | 'justify';

export interface ReaderPrefs {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;   // px
  lineHeight: number; // unitless multiplier
  width: ReaderWidth;
  align: ReaderAlign;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  theme: 'night',
  font: 'sans',
  fontSize: 18,
  lineHeight: 1.8,
  width: 'wide',
  align: 'left',
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
  night: {
    label: 'Night',
    zoneBg: '#0a0a12',
    paperBg: '#12121e',
    border: 'rgba(30, 41, 59, 0.6)',
    text: '#cbd5e1',
    heading: '#f1f5f9',
    muted: '#64748b',
    accent: '#22d3ee',
    swatch: '#12121e',
  },
  black: {
    label: 'Black',
    zoneBg: '#000000',
    paperBg: '#050507',
    border: 'rgba(39, 39, 42, 0.8)',
    text: '#b4b8c2',
    heading: '#e4e6eb',
    muted: '#5b6070',
    accent: '#22d3ee',
    swatch: '#000000',
  },
  sepia: {
    label: 'Sepia',
    zoneBg: '#e8dcc0',
    paperBg: '#f4ecd8',
    border: 'rgba(160, 130, 90, 0.3)',
    text: '#4a3a2a',
    heading: '#2e2216',
    muted: '#8a7356',
    accent: '#a0522d',
    swatch: '#f4ecd8',
  },
  paper: {
    label: 'Paper',
    zoneBg: '#e7e7e2',
    paperBg: '#fbfbf8',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#2b2b2b',
    heading: '#111111',
    muted: '#7a7a7a',
    accent: '#0e7490',
    swatch: '#fbfbf8',
  },
};

export const READER_FONTS: Record<ReaderFont, { label: string; family: string }> = {
  sans: { label: 'Sans', family: "'Inter', system-ui, -apple-system, sans-serif" },
  serif: { label: 'Serif', family: "'Literata', 'Noto Serif', Georgia, serif" },
  classic: { label: 'Classic', family: "Georgia, 'Times New Roman', Times, serif" },
};

export const READER_WIDTHS: Record<ReaderWidth, { label: string; maxWidth: string }> = {
  narrow: { label: 'Narrow', maxWidth: '42rem' },
  medium: { label: 'Medium', maxWidth: '54rem' },
  wide: { label: 'Wide', maxWidth: '72rem' }, // matches the original max-w-6xl layout
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
