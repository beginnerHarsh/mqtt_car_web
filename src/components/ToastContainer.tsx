import React from 'react';
import { NotificationToast } from '../types/vehicle';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getIcon = (type: NotificationToast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: NotificationToast['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-slate-900/90';
      case 'warning':
        return 'border-amber-500/40 bg-slate-900/90';
      case 'error':
        return 'border-rose-500/40 bg-slate-900/90';
      default:
        return 'border-cyan-500/40 bg-slate-900/90';
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all animate-slide-up ${getBorderColor(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 font-sans">
            <div className="text-xs font-bold text-slate-100">{toast.title}</div>
            <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</div>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
