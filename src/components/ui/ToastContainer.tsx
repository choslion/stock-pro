import { useToastStore } from "../../store/useToastStore";
import { useEffect, useRef, useState } from "react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [visibleIds, setVisibleIds] = useState<number[]>([]);

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timers.current[toast.id]) return;

      setVisibleIds((ids) => [...ids, toast.id]);

      timers.current[toast.id] = setTimeout(() => {
        setVisibleIds((ids) => ids.filter((id) => id !== toast.id));
        setTimeout(() => {
          removeToast(toast.id);
          delete timers.current[toast.id];
        }, 300);
      }, 2000);
    });
  }, [toasts, removeToast]);

  return (
    <div className="fixed top-5 right-5 z-50 space-y-2">
      {toasts.map((toast) => {
        const isVisible = visibleIds.includes(toast.id);
        return (
          <div
            key={toast.id}
            className={`p-3 rounded-lg shadow-lg transition-opacity duration-300 ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-green-500 text-white"
            } ${isVisible ? "opacity-100" : "opacity-0"}`}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
