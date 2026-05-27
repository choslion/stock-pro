import { create } from "zustand";

export type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "error") =>
    set((state) => {
      const alreadyExists = state.toasts.some((t) => t.message === message);
      if (alreadyExists) return state;
      toastId += 1;
      return {
        toasts: [...state.toasts, { id: toastId, message, type }],
      };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
