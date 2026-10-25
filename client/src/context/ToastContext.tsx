import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/** Lightweight toast notifications — replaces blocking alert() popups. */

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string; }

interface ToastContextType {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const ACCENTS = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-primary-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = nextId.current++;
    setToasts(list => [...list.slice(-3), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed z-[100] bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        role="status"
      >
        {toasts.map(t => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-elevated px-4 py-3 shadow-[var(--rw-shadow-lg)] animate-toast"
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ACCENTS[t.kind]}`} />
              <p className="flex-1 text-sm text-ink-200 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 p-1 rounded-md text-ink-500 hover:text-ink-200 transition"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
