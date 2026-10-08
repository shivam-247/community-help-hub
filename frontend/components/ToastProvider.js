"use client";
import { X } from "lucide-react";
import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Set());
  const notify = useCallback((message, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-3), { id, message, kind }]);
    const timer = setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
      timers.current.delete(timer);
    }, 6000);
    timers.current.add(timer);
  }, []);
  useEffect(() => {
    const activeTimers = timers.current;
    let lastSlowNotice = 0;
    const slow = () => {
      if (Date.now() - lastSlowNotice > 60000) {
        lastSlowNotice = Date.now();
        notify("The server may be waking up. Your request is still loading; this can take up to a minute.");
      }
    };
    window.addEventListener("chh-api-slow", slow);
    return () => { activeTimers.forEach(clearTimeout); window.removeEventListener("chh-api-slow", slow); };
  }, [notify]);
  return <ToastContext.Provider value={notify}>
    {children}
    <div aria-live="polite" aria-atomic="false" className="fixed bottom-5 right-5 left-5 sm:left-auto sm:w-96 z-50 space-y-2">
      {toasts.map((toast) => <div key={toast.id} role={toast.kind === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg bg-surface text-sm ${toast.kind === "error" ? "border-danger-soft text-danger" : "border-success-soft text-success"}`}>
        <p className="flex-1">{toast.message}</p>
        <button aria-label="Dismiss notification" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))} className="min-h-11 min-w-11 flex items-center justify-center"> <X className="size-4" aria-hidden="true"/> </button>
      </div>)}
    </div>
  </ToastContext.Provider>;
}
export function useToast() { return useContext(ToastContext); }

