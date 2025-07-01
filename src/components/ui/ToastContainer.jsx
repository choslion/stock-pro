import { useToastStore } from "../../store/useToastStore";
import { useEffect, useRef, useState } from "react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const timers = useRef({});
  const [visibleIds, setVisibleIds] = useState([]);

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timers.current[toast.id]) return;

      // 보여지게 만들고 → 제거 예약
      setVisibleIds((ids) => [...ids, toast.id]);

      timers.current[toast.id] = setTimeout(() => {
        // 1단계: 투명화
        setVisibleIds((ids) => ids.filter((id) => id !== toast.id));

        // 2단계: DOM 제거는 300ms 후
        setTimeout(() => {
          removeToast(toast.id);
          delete timers.current[toast.id];
        }, 300); // fade-out duration과 맞춰야 함
      }, 2000);
    });

    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [toasts]);

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
