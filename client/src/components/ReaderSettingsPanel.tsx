import { X, Minus, Plus, RotateCcw, TextAlignStart, TextAlignJustify, Keyboard, Sun, Moon, Monitor, Maximize2 } from 'lucide-react';
import {
  READER_THEMES, READER_FONTS, READER_WIDTHS, READER_SPACINGS, LINE_HEIGHTS, FONT_SIZE_MIN, FONT_SIZE_MAX,
} from '../lib/readerPrefs';
import type { ReaderPrefs, ReaderTheme, ReaderFont, ReaderWidth, ReaderSpacing } from '../lib/readerPrefs';
import { useTheme, type ThemePreference } from '../context/ThemeContext';

interface ReaderSettingsPanelProps {
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onReset: () => void;
  onClose: () => void;
  onFocusMode?: () => void;
}

function Section({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

const segBtn = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-1.5 px-2 min-h-9 rounded-lg text-sm transition ${
    active ? 'bg-surface text-primary-300 font-semibold shadow-sm ring-1 ring-primary-500/40' : 'text-ink-400 hover:text-ink-100'
  }`;
const segGroup = 'flex gap-1 bg-ink-900 rounded-xl p-1';

function Stepper({ value, onDec, onInc, decDisabled, incDisabled, decLabel, incLabel }: {
  value: string; onDec: () => void; onInc: () => void;
  decDisabled: boolean; incDisabled: boolean; decLabel: string; incLabel: string;
}) {
  const btn = 'w-10 h-9 flex items-center justify-center rounded-lg text-ink-300 hover:bg-surface hover:text-primary-300 disabled:opacity-30 disabled:hover:bg-transparent transition';
  return (
    <div className="flex items-center justify-between bg-ink-900 rounded-xl p-1">
      <button type="button" onClick={onDec} disabled={decDisabled} className={btn} aria-label={decLabel}>
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-sm font-semibold text-ink-200 tabular-nums">{value}</span>
      <button type="button" onClick={onInc} disabled={incDisabled} className={btn} aria-label={incLabel}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

const SITE_THEMES: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo máy', icon: Monitor },
];

export default function ReaderSettingsPanel({ prefs, onChange, onReset, onClose, onFocusMode }: ReaderSettingsPanelProps) {
  const lhIndex = LINE_HEIGHTS.indexOf(prefs.lineHeight);
  const { preference, setPreference } = useTheme();

  return (
    <>
      {/* Click-away backdrop (dimmed only on mobile, where the panel is a bottom sheet) */}
      <div className="fixed inset-0 z-[60] bg-black/50 md:bg-transparent" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Cài đặt đọc"
        className="fixed z-[61] inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl
          md:inset-x-auto md:bottom-auto md:right-4 md:top-[7.75rem] md:w-[22rem] md:max-h-[calc(100vh-9rem)] md:rounded-2xl
          bg-elevated border border-line shadow-[var(--rw-shadow-lg)] animate-reader-pop"
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center pt-2.5">
          <div className="w-10 h-1 rounded-full bg-ink-700" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-4">
          <h2 className="text-base font-bold text-ink-100">Cài đặt đọc</h2>
          <button type="button" onClick={onClose} className="btn-icon -mr-2" aria-label="Đóng cài đặt">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          <Section label="Giao diện trang web">
            <div className={segGroup}>
              {SITE_THEMES.map(t => (
                <button key={t.value} type="button" onClick={() => setPreference(t.value)} aria-pressed={preference === t.value} className={segBtn(preference === t.value)}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Màu nền trang đọc">
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map(key => {
                const t = READER_THEMES[key];
                const active = prefs.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ theme: key })}
                    aria-pressed={active}
                    aria-label={`Màu nền ${t.label}`}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <span
                      className={`w-full h-11 rounded-xl flex items-center justify-center text-base font-semibold transition ${
                        active ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-elevated' : 'ring-1 ring-ink-700 group-hover:ring-ink-500'
                      }`}
                      style={{ background: t.swatch, color: key === 'auto' ? undefined : t.text, fontFamily: READER_FONTS.serif.family }}
                    >
                      {key === 'auto' ? <span className="rounded px-1 bg-white/80 text-[#121722] text-xs">Aa</span> : 'Aa'}
                    </span>
                    <span className={`text-[11px] leading-tight text-center ${active ? 'text-primary-300 font-semibold' : 'text-ink-500'}`}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Phông chữ">
            <div className={segGroup}>
              {(Object.keys(READER_FONTS) as ReaderFont[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ font: key })}
                  aria-pressed={prefs.font === key}
                  className={segBtn(prefs.font === key)}
                  style={{ fontFamily: READER_FONTS[key].family }}
                >
                  {READER_FONTS[key].label}
                </button>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-3">
            <Section label="Cỡ chữ">
              <Stepper
                value={`${prefs.fontSize}px`}
                onDec={() => onChange({ fontSize: prefs.fontSize - 1 })}
                onInc={() => onChange({ fontSize: prefs.fontSize + 1 })}
                decDisabled={prefs.fontSize <= FONT_SIZE_MIN}
                incDisabled={prefs.fontSize >= FONT_SIZE_MAX}
                decLabel="Giảm cỡ chữ"
                incLabel="Tăng cỡ chữ"
              />
            </Section>
            <Section label="Giãn dòng">
              <Stepper
                value={prefs.lineHeight.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')}
                onDec={() => onChange({ lineHeight: LINE_HEIGHTS[lhIndex - 1] })}
                onInc={() => onChange({ lineHeight: LINE_HEIGHTS[lhIndex + 1] })}
                decDisabled={lhIndex <= 0}
                incDisabled={lhIndex >= LINE_HEIGHTS.length - 1}
                decLabel="Giảm giãn dòng"
                incLabel="Tăng giãn dòng"
              />
            </Section>
          </div>

          <Section label="Khoảng cách đoạn">
            <div className={segGroup}>
              {(Object.keys(READER_SPACINGS) as ReaderSpacing[]).map(key => (
                <button key={key} type="button" onClick={() => onChange({ spacing: key })} aria-pressed={prefs.spacing === key} className={segBtn(prefs.spacing === key)}>
                  {READER_SPACINGS[key].label}
                </button>
              ))}
            </div>
          </Section>

          {/* Page width only matters on larger screens */}
          <Section label="Độ rộng trang" className="hidden md:block">
            <div className={segGroup}>
              {(Object.keys(READER_WIDTHS) as ReaderWidth[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ width: key })}
                  aria-pressed={prefs.width === key}
                  className={segBtn(prefs.width === key)}
                >
                  {READER_WIDTHS[key].label}
                </button>
              ))}
            </div>
          </Section>

          <Section label="Căn lề">
            <div className={segGroup}>
              <button type="button" onClick={() => onChange({ align: 'left' })} aria-pressed={prefs.align === 'left'} className={segBtn(prefs.align === 'left')}>
                <TextAlignStart className="w-4 h-4" /> Trái
              </button>
              <button type="button" onClick={() => onChange({ align: 'justify' })} aria-pressed={prefs.align === 'justify'} className={segBtn(prefs.align === 'justify')}>
                <TextAlignJustify className="w-4 h-4" /> Đều hai bên
              </button>
            </div>
          </Section>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-ink-300">Thụt lề đầu đoạn</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.indent}
              onClick={() => onChange({ indent: !prefs.indent })}
              className={`relative w-11 h-6 rounded-full transition shrink-0 ${prefs.indent ? 'bg-primary-500' : 'bg-ink-700'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${prefs.indent ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>

          {onFocusMode && (
            <button type="button" onClick={onFocusMode} className="btn btn-soft w-full">
              <Maximize2 className="w-4 h-4" /> Chế độ đọc tập trung
            </button>
          )}

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onReset} className="btn btn-ghost btn-sm -ml-3">
              <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
            </button>
            <span className="hidden md:flex items-center gap-1.5 text-[11px] text-ink-500" title="Phím tắt">
              <Keyboard className="w-3.5 h-3.5" />
              <kbd className="px-1 rounded bg-ink-900 text-ink-400">←</kbd>
              <kbd className="px-1 rounded bg-ink-900 text-ink-400">→</kbd> chuyển chương
              <kbd className="px-1 rounded bg-ink-900 text-ink-400 ml-1">F</kbd> tập trung
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
