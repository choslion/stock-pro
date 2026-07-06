import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WatchlistEntry } from "../config/watchlist";

const MAX_ENTRIES = 30; // 백엔드 /watchlist 쿼리 길이 보호

interface WatchlistStore {
  entries: WatchlistEntry[];
  add:    (entry: WatchlistEntry) => void;
  remove: (ticker: string) => void;
  has:    (ticker: string) => boolean;
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      entries: [],
      add: (entry) =>
        set((state) => {
          if (state.entries.some((e) => e.ticker === entry.ticker)) return state;
          if (state.entries.length >= MAX_ENTRIES) return state;
          return { entries: [...state.entries, entry] };
        }),
      remove: (ticker) =>
        set((state) => ({ entries: state.entries.filter((e) => e.ticker !== ticker) })),
      has: (ticker) => get().entries.some((e) => e.ticker === ticker),
    }),
    { name: "stock-pro-watchlist" },
  ),
);
