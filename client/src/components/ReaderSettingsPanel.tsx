import { X, Minus, Plus, RotateCcw, TextAlignStart, TextAlignJustify, Keyboard } from 'lucide-react';
import {
  READER_THEMES, READER_FONTS, READER_WIDTHS, LINE_HEIGHTS, FONT_SIZE_MIN, FONT_SIZE_MAX,
} from '../lib/readerPrefs';
import type { ReaderPrefs, ReaderTheme, ReaderFont, ReaderWidth } from '../lib/readerPrefs';

interface ReaderSettingsPanelProps {
  prefs: ReaderPrefs;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onReset: () => void;
  onClose: () => void;
}

function Section({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

const segBtn = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-sm transition ${
    active ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
  }`;

function Stepper({ value, onDec, onInc, decDisabled, incDisabled, decLabel, incLabel }: {
  value: string; onDec: () => void; onInc: () => void;
  decDisabled: boolean; incDisabled: boolean; decLabel: string; incLabel: string;
}) {
  const btn = 'w-10 h-9 flex items-center justify-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-cyan-300 disabled:opacity-30 disabled:hover:bg-transparent transition';
  return (
    <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg p-1">
      <button type="button" onClick={onDec} disabled={decDisabled} className={btn} aria-label={decLabel}>
        <Minus className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-slate-200 tabular-nums">{value}</span>
      <button type="button" onClick={onInc} disabled={incDisabled} className={btn} aria-label={incLabel}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ReaderSettingsPanel({ prefs, onChange, onReset, onClose }: ReaderSettingsPanelProps) {
  const lhIndex = LINE_HEIGHTS.indexOf(prefs.lineHeight);

  return (
    <>
      {/* Click-away backdrop (dimmed only on mobile, where the panel is a bottom sheet) */}
      <div className="fixed inset-0 z-[60] bg-black/50 md:bg-transparent" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Reading settings"
        className="fixed z-[61] inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl
          md:inset-x-auto md:bottom-auto md:right-4 md:top-[7.75rem] md:w-80 md:rounded-xl
          bg-[#11111c] border border-slate-800 shadow-2xl shadow-black/60 animate-reader-pop"
      >
        {/* Mobile grab handle */}
        <div className="md:hidden flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-4">
          <h2 className="text-base font-bold text-slate-100 font-['Rajdhani'] tracking-wide">Reading Settings</h2>
          <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition" aria-label="Close settings">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          <Section label="Theme">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(READER_THEMES) as ReaderTheme[]).map(key => {
                const t = READER_THEMES[key];
                const active = prefs.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange({ theme: key })}
                    aria-pressed={active}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <span
                      className={`w-full h-11 rounded-lg flex items-center justify-center text-base font-semibold transition ${
                        active ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#11111c]' : 'ring-1 ring-slate-700 group-hover:ring-slate-500'
                      }`}
                      style={{ background: t.swatch, color: t.text, fontFamily: READER_FONTS.serif.family }}
                    >
                      Aa
                    </span>
                    <span className={`text-xs ${active ? 'text-cyan-300' : 'text-slate-500'}`}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Font">
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
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
            <Section label="Text size">
              <Stepper
                value={`${prefs.fontSize}px`}
                onDec={() => onChange({ fontSize: prefs.fontSize - 1 })}
                onInc={() => onChange({ fontSize: prefs.fontSize + 1 })}
                decDisabled={prefs.fontSize <= FONT_SIZE_MIN}
                incDisabled={prefs.fontSize >= FONT_SIZE_MAX}
                decLabel="Decrease text size"
                incLabel="Increase text size"
              />
            </Section>
            <Section label="Line spacing">
              <Stepper
                value={prefs.lineHeight.toFixed(2).replace(/0+$/, '').replace(/\.$/, '.0')}
                onDec={() => onChange({ lineHeight: LINE_HEIGHTS[lhIndex - 1] })}
                onInc={() => onChange({ lineHeight: LINE_HEIGHTS[lhIndex + 1] })}
                decDisabled={lhIndex <= 0}
                incDisabled={lhIndex >= LINE_HEIGHTS.length - 1}
                decLabel="Decrease line spacing"
                incLabel="Increase line spacing"
              />
            </Section>
          </div>

          {/* Page width only matters on larger screens */}
          <Section label="Page width" className="hidden md:block">
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
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

          <Section label="Alignment">
            <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
              <button type="button" onClick={() => onChange({ align: 'left' })} aria-pressed={prefs.align === 'left'} className={segBtn(prefs.align === 'left')}>
                <TextAlignStart className="w-4 h-4" /> Left
              </button>
              <button type="button" onClick={() => onChange({ align: 'justify' })} aria-pressed={prefs.align === 'justify'} className={segBtn(prefs.align === 'justify')}>
                <TextAlignJustify className="w-4 h-4" /> Justify
              </button>
            </div>
          </Section>

          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={onReset} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300 transition">
              <RotateCcw className="w-3.5 h-3.5" /> Reset to default
            </button>
            <span className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-600" title="Keyboard shortcuts">
              <Keyboard className="w-3.5 h-3.5" />
              <kbd className="px-1 rounded bg-slate-800 text-slate-400">←</kbd>
              <kbd className="px-1 rounded bg-slate-800 text-slate-400">→</kbd> chapters
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
