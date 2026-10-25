import { Upload, X, Check } from 'lucide-react';
import { GENRES, genreLabel, TAG_CATEGORIES } from '../lib/i18n';

/** Form controls shared by the create / edit story pages. Values stay in the stored (English) format. */

export function GenrePicker({ value, onChange }: { value: string[]; onChange: (genres: string[]) => void }) {
  return (
    <fieldset>
      <legend className="label">Thể loại</legend>
      <div className="flex flex-wrap gap-2">
        {GENRES.map(g => {
          const active = value.includes(g);
          return (
            <button
              key={g}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter(x => x !== g) : [...value, g])}
              className="chip"
            >
              {active && <Check className="w-3.5 h-3.5" />} {genreLabel(g)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const TAG_STYLES = {
  red: 'bg-rose-500/10 border-rose-500/40 text-rose-500',
  yellow: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
  orange: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
};

export function CategoryPicker({ type, value, onChange }: { type: 'text' | 'comic'; value: string[]; onChange: (tags: string[]) => void }) {
  const keys = type === 'text' ? ['light_novel', 'web_novel'] : ['manga'];
  return (
    <fieldset>
      <legend className="label">Phân loại</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {keys.map(tagKey => {
          const tag = TAG_CATEGORIES[tagKey as keyof typeof TAG_CATEGORIES];
          const checked = value.includes(tagKey);
          return (
            <label key={tagKey} className={`flex items-center gap-3 p-3 min-h-12 rounded-xl border cursor-pointer transition ${checked ? TAG_STYLES[tag.color] : 'border-line text-ink-400 hover:border-ink-600'}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked ? [...value, tagKey] : value.filter(t => t !== tagKey))}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-sm font-semibold">{tag.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CoverPicker({ preview, onFile, onClear, canClear = true }: {
  preview?: string; onFile: (file: File) => void; onClear: () => void; canClear?: boolean;
}) {
  return (
    <div>
      <span className="label">Ảnh bìa</span>
      <div className="flex items-start gap-4">
        {preview && (
          <div className="relative w-36">
            <img src={preview} alt="Ảnh bìa" className="w-36 h-52 object-cover rounded-xl border border-line shadow-sm" />
            {canClear && (
              <button type="button" onClick={onClear} aria-label="Bỏ ảnh đã chọn"
                className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        <label className="flex flex-col items-center justify-center w-36 h-52 border-2 border-dashed border-ink-700 rounded-xl cursor-pointer hover:border-primary-500/60 hover:bg-primary-500/5 transition text-center px-2">
          <Upload className="w-7 h-7 text-ink-500 mb-2" />
          <span className="text-xs text-ink-400 font-medium">{preview ? 'Thay ảnh khác' : 'Tải ảnh bìa lên'}</span>
          <span className="text-[11px] text-ink-500 mt-1">Tỉ lệ 3:4</span>
          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} className="hidden" />
        </label>
      </div>
    </div>
  );
}
