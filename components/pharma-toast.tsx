'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Copy, Check, Mail } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  copyable?: boolean;
  onEmail?: () => void;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id, duration: toast.duration || 8000 };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => removeToast(id), newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: {
    bg: 'var(--background)',
    border: '#10B981',
    icon: '#10B981',
    glow: '0 8px 30px rgba(16,185,129,0.2)',
  },
  error: {
    bg: 'var(--background)',
    border: '#EF4444',
    icon: '#EF4444',
    glow: '0 8px 30px rgba(239,68,68,0.2)',
  },
  warning: {
    bg: 'var(--background)',
    border: '#F59E0B',
    icon: '#F59E0B',
    glow: '0 8px 30px rgba(245,158,11,0.2)',
  },
  info: {
    bg: 'var(--background)',
    border: '#0EA5E9',
    icon: '#0EA5E9',
    glow: '0 8px 30px rgba(14,165,233,0.2)',
  },
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const Icon = toastIcons[toast.type];
  const styles = toastStyles[toast.type];

  useEffect(() => {
    // Trigger animation
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleCopy = async () => {
    const textToCopy = toast.title ? `${toast.title}\n\n${toast.message}` : toast.message;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEmail = () => {
    if (toast.onEmail) {
      toast.onEmail();
    } else {
      const subject = encodeURIComponent(toast.title || 'Notification');
      const body = encodeURIComponent(toast.title ? `${toast.title}\n\n${toast.message}` : toast.message);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    }
  };

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 p-4 rounded-xl 
        border backdrop-blur-md min-w-[320px] max-w-[400px]
        transition-all duration-300 ease-out transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      style={{
        background: styles.bg,
        borderColor: styles.border,
        boxShadow: `${styles.glow}, 0 10px 30px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={20} style={{ color: styles.icon }} />
      </div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-bold text-sm mb-1" style={{ color: 'var(--foreground)' }}>
            {toast.title}
          </p>
        )}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {toast.message}
        </p>
      </div>
      <div className="flex flex-col gap-1 items-end">
        {(toast.copyable || toast.onEmail) && (
          <div className="flex gap-1">
            {toast.copyable && (
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60"
                title="Copy notification"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
            {toast.onEmail && (
              <button
                onClick={handleEmail}
                className="flex-shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60"
                title="Send via email"
              >
                <Mail size={14} />
              </button>
            )}
          </div>
        )}
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white/60"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
