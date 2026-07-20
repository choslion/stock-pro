import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaperTrade } from "../lib/portfolio";

export interface WeeklyReview {
  weekKey: string;
  summary: string;
  bestDecision: string;
  repeatedMistake: string;
  createdAt: string;
  tradeVersion?: string;
}

interface PortfolioStore {
  trades: PaperTrade[];
  reviews: WeeklyReview[];
  addTrade: (trade: Omit<PaperTrade, "id" | "createdAt">) => void;
  saveReview: (review: WeeklyReview) => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],
      reviews: [],
      addTrade: (trade) =>
        set((state) => ({
          trades: [
            {
              ...trade,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
            ...state.trades,
          ],
        })),
      saveReview: (review) =>
        set((state) => ({
          reviews: [review, ...state.reviews.filter((item) => item.weekKey !== review.weekKey)].slice(0, 12),
        })),
    }),
    { name: "stock-pro-paper-portfolio", version: 1 },
  ),
);
