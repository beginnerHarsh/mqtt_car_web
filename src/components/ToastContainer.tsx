import React, { useEffect, useState, useRef } from 'react';
import { NotificationToast } from '../types/vehicle';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
  autoHideDuration?: number; // Duration in ms before auto hiding (default 4500ms)
}

interface ToastItemProps {
  toast: NotificationToast;
  onDismiss: (id: string) => void;
  autoHideDuration: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, autoHideDuration }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (!isHovered) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
        setProgress(remaining);
      }
    }, 50);

    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, autoHideDuration);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss, autoHideDuration, isHovered]);

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

  const getBorderAndBg = (type: NotificationToast['type']) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-slate-900/95';
      case 'warning':
        return 'border-amber-500/40 bg-slate-900/95';
      case 'error':
        return 'border-rose-500/40 bg-slate-900/95';
      default:
        return 'border-cyan-500/40 bg-slate-900/95';
    }
  };

  const getProgressBarColor = (type: NotificationToast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500';
      case 'warning':
        return 'bg-amber-500';
      case 'error':
        return 'bg-rose-500';
      default:
        return 'bg-cyan-500';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden flex flex-col p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 transform translate-y-0 ${getBorderAndBg(
        toast.type
      )}`}
    >
      <div className="flex items-start gap-3">
        {getIcon(toast.type)}
        <div className="flex-1 font-sans min-w-0">
          <div className="text-xs font-bold text-slate-100 truncate">{toast.title}</div>
          <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</div>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className="mt-2 text-[10px] font-extrabold font-mono bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              🎯 {toast.actionLabel}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white transition-colors p-0.5"
          title="Close Notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-Hide Animated Progress Countdown Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/60 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${getProgressBarColor(toast.type)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  autoHideDuration = 4500,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          autoHideDuration={autoHideDuration}
        />
      ))}
    </div>
  );
};
