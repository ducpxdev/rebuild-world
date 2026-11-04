import { useId, useState } from 'react';
import { ShieldCheck, ChevronDown, Check, Loader2, Ban } from 'lucide-react';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/i18n';
import { useToast } from '../context/ToastContext';
import { ROLES, ROLE_KEYS, asRole, type RoleKey } from '../lib/roles';

interface RoleManagerProps {
  username: string;
  role: RoleKey | null;
  isMod: boolean;
  /** Target is an admin (already has moderator permission implicitly). */
  targetIsAdmin: boolean;
  /** Viewer is an admin and may grant/revoke moderator permission. */
  canGrantMod: boolean;
  onRoleChange: (role: RoleKey | null) => void;
  onModChange: (isMod: boolean) => void;
}

/** Moderator tools on a profile: assign a display role, and (admins) toggle moderator permission. */
export default function RoleManager({ username, role, isMod, targetIsAdmin, canGrantMod, onRoleChange, onModChange }: RoleManagerProps) {
  const { showToast } = useToast();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<RoleKey | 'none' | null>(null);
  const [savingMod, setSavingMod] = useState(false);

  const assignRole = async (next: RoleKey | null) => {
    if (pending || next === role) return;
    setPending(next ?? 'none');
    try {
      const res = await api.put(`/users/${encodeURIComponent(username)}/role`, { role: next });
      const saved = asRole(res.data?.role);
      onRoleChange(saved);
      showToast(saved ? `Đã gán vai trò ${ROLES[saved].label} cho ${username}` : `Đã gỡ vai trò của ${username}`, 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Không thể cập nhật vai trò'), 'error');
    } finally {
      setPending(null);
    }
  };

  const toggleMod = async () => {
    if (savingMod) return;
    setSavingMod(true);
    try {
      const res = await api.put(`/users/${encodeURIComponent(username)}/mod`, { is_mod: !isMod });
      const next = !!res.data?.is_mod;
      onModChange(next);
      showToast(next ? `${username} đã trở thành điều hành viên` : `Đã thu hồi quyền điều hành của ${username}`, 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Không thể cập nhật quyền điều hành'), 'error');
    } finally {
      setSavingMod(false);
    }
  };

  const options: Array<RoleKey | null> = [null, ...ROLE_KEYS];

  return (
    <div className="mt-5 rounded-2xl border border-line bg-ink-950/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-2xl hover:bg-ink-900/60 transition"
      >
        <span className="w-8 h-8 rounded-lg bg-primary-500/12 text-primary-300 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink-200">Công cụ điều hành</span>
          <span className="flex items-center gap-1.5 text-xs text-ink-500">
            Vai trò:
            {role ? (
              <><span className={`role-dot role-${role}`} aria-hidden="true" /><span className="text-ink-300 font-medium">{ROLES[role].label}</span></>
            ) : (
              <span>Mặc định</span>
            )}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={panelId} className="px-4 pb-4 pt-3 border-t border-line">
          <p className="text-xs text-ink-500 mb-3">
            Chọn vai trò hiển thị — màu tên sẽ được áp dụng ở mọi nơi tên của <span className="font-medium text-ink-300">{username}</span> xuất hiện.
          </p>
          <div role="radiogroup" aria-label="Vai trò hiển thị" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {options.map(key => {
              const selected = key === role;
              const busy = pending === (key ?? 'none');
              return (
                <button
                  key={key ?? 'none'}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!pending}
                  onClick={() => assignRole(key)}
                  className={`relative text-left rounded-xl border px-3 py-2.5 transition disabled:cursor-wait ${
                    selected
                      ? 'border-primary-500/60 bg-primary-500/8 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary-500)_15%,transparent)]'
                      : 'border-line bg-surface hover:border-primary-500/35'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    {key ? <span className={`role-dot role-${key}`} aria-hidden="true" /> : <Ban className="w-3 h-3" />}
                    {key ? ROLES[key].label : 'Mặc định'}
                  </span>
                  {/* Inline inner span so the role gradient spans the name, not the whole card */}
                  <span className="block mt-1 text-sm font-semibold truncate">
                    <span className={key ? `role-name role-${key}` : 'text-ink-200'}>{username}</span>
                  </span>
                  <span className="block text-[11px] text-ink-500 truncate">{key ? ROLES[key].description : 'Kiểu tên thông thường'}</span>
                  {(selected || busy) && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] flex items-center justify-center">
                      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {canGrantMod && !targetIsAdmin && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink-200">Quyền điều hành (Mod)</p>
                <p className="text-xs text-ink-500">Cho phép người này gán vai trò cho người dùng khác.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isMod}
                aria-label="Quyền điều hành"
                onClick={toggleMod}
                disabled={savingMod}
                className={`relative w-11 h-6 rounded-full shrink-0 transition disabled:opacity-60 ${isMod ? 'bg-[var(--btn-primary-bg)]' : 'bg-ink-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isMod ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
