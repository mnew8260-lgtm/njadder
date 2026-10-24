"use client";

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";

// ════════════════════════════════════════════════════════════
// Toast Notification System
// ════════════════════════════════════════════════════════════

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      toast: (msg: string) => console.log("[toast]", msg),
      success: (msg: string) => console.log("[toast:success]", msg),
      error: (msg: string) => console.error("[toast:error]", msg),
      info: (msg: string) => console.info("[toast:info]", msg),
      warning: (msg: string) => console.warn("[toast:warning]", msg),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-remove after 4 seconds
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);
  const warning = useCallback((msg: string) => toast(msg, "warning"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const styles = {
    success: "bg-green-500/15 border-green-500/30 text-green-300",
    error: "bg-red-500/15 border-red-500/30 text-red-300",
    info: "bg-blue-500/15 border-blue-500/30 text-blue-300",
    warning: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  };

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  return (
    <div
      className={`pointer-events-auto border rounded-xl px-4 py-3 shadow-lg backdrop-blur-md text-sm font-medium transition-all duration-300 ${
        styles[toast.type]
      } ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      onClick={onClose}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span>{icons[toast.type]}</span>
        <span className="flex-1">{toast.message}</span>
        <button onClick={onClose} className="text-neutral-400 hover:text-white text-xs">✕</button>
      </div>
    </div>
  );
}
