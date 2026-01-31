import { useEffect, useState } from 'react';
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
    <div className="flex items-center gap-3 bg-mystic-800/95 backdrop-blur-sm border border-mystic-600/50 rounded-xl px-4 py-3 shadow-xl animate-slide-up">
      <Icon className={`w-5 h-5 flex-shrink-0 ${colors[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-mystic-100">{message}</p>
        {action && (
          <button
            onClick={handleAction}
            className="mt-1 text-xs text-cosmic-blue hover:text-cosmic-blue/80 transition-colors flex items-center gap-0.5"
          >
            {action.label}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <button onClick={() => onDismiss(id)} className="text-mystic-400 hover:text-mystic-200 flex-shrink-0">
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

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none md:left-auto md:right-6 md:max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
