import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X, ChevronRight } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
}

interface ToastProps extends Toast {
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
};

const colors = {
  success: 'text-emerald-400',
  error: 'text-red-400',
  info: 'text-gold',
};

/** How many toasts can be on screen before the oldest is retired. */
const MAX_VISIBLE = 3;

const EASE_OUT: [number, number, number, number] = [0.22, 0.8, 0.25, 1];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

function ToastItem({ id, message, type, action, onDismiss }: ToastProps) {
  const Icon = icons[type];

  useEffect(() => {
    const duration = action ? 6000 : 4000;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, onDismiss, action]);

  const handleAction = () => {
    action?.onClick();
    onDismiss(id);
  };

  return (
    <div className="flex items-center gap-3 bg-mystic-800/95 backdrop-blur-sm border border-mystic-600/50 rounded-xl px-4 py-3 shadow-xl">
      <Icon className={`w-5 h-5 flex-shrink-0 ${colors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-mystic-100">{message}</p>
        {action && (
          <button
            onClick={handleAction}
            className="
              mt-1 text-xs text-cosmic-blue flex items-center gap-0.5
              transition-[transform,color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
              touch-manipulation [-webkit-tap-highlight-color:transparent]
              motion-safe:active:scale-[0.97] active:text-cosmic-blue/80
              [@media(hover:hover)]:[&:hover:not(:active)]:text-cosmic-blue/80
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded
            "
          >
            {action.label}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="
          text-mystic-400 flex-shrink-0 rounded
          transition-[transform,color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
          touch-manipulation [-webkit-tap-highlight-color:transparent]
          motion-safe:active:scale-90 active:text-mystic-200
          [@media(hover:hover)]:[&:hover:not(:active)]:text-mystic-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
        "
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

let toastId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function toast(message: string, type: ToastType = 'info', action?: ToastAction) {
  const newToast: Toast = {
    id: String(++toastId),
    message,
    type,
    action,
  };
  listeners.forEach(listener => listener(newToast));
}

/**
 * A stack that does not fight itself.
 *
 * Three things were wrong. Toasts arrived on `animate-slide-up` and left by
 * being deleted from the array mid-frame, so the last thing the user saw was a
 * disappearance rather than a departure. The container is bottom-anchored, so
 * every new toast shoved the existing ones upward in a single frame. And
 * nothing capped the stack, so a burst of errors could paper over the screen.
 *
 * framer-motion is doing the work here because the third problem needs FLIP —
 * `layout` measures the shove and plays it back as a transform. It is already
 * in the main chunk (App.tsx imports AnimatePresence for route transitions),
 * so this costs nothing at the bundle level.
 *
 *   enter 200ms ease-out, rising 12px  — arriving
 *   exit  160ms ease-in, shrinking     — leaving, and faster, always
 *
 * `useReducedMotion` is not decoration: the CSS reduce-motion block in
 * index.css cannot reach framer's rAF-driven inline styles, so this is the
 * only thing standing between a reduced-motion user and a full slide.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const reduce = !!useReducedMotion();

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast].slice(-MAX_VISIBLE));
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:left-auto md:right-6 md:max-w-sm">
      <AnimatePresence initial={false}>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            layout={!reduce}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, scale: 0.96, transition: { duration: 0.16, ease: EASE_IN } }
            }
            transition={reduce ? { duration: 0.12 } : { duration: 0.2, ease: EASE_OUT }}
            className="pointer-events-auto"
          >
            <ToastItem {...t} onDismiss={dismiss} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
