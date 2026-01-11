import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
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

function ToastItem({ id, message, type, onDismiss }: ToastProps) {
  const Icon = icons[type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="flex items-center gap-3 bg-mystic-800/95 backdrop-blur-sm border border-mystic-600/50 rounded-xl px-4 py-3 shadow-xl animate-slide-up">
      <Icon className={`w-5 h-5 ${colors[type]}`} />
      <p className="text-sm text-mystic-100 flex-1">{message}</p>
      <button onClick={() => onDismiss(id)} className="text-mystic-400 hover:text-mystic-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

let toastId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function toast(message: string, type: ToastType = 'info') {
  const newToast: Toast = {
    id: String(++toastId),
    message,
    type,
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
