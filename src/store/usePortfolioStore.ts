import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaperTrade } from "../lib/portfolio";

interface PortfolioStore {
  trades: PaperTrade[];
  addTrade: (trade: Omit<PaperTrade, "id" | "createdAt">) => void;
}

/** v1은 매수만 기록했고 매수 이유·목표 기간·메모를 함께 저장했다.
 *  기록 자체는 살리고 매수(side: "buy")로 옮긴다. */
interface LegacyState {
  trades?: (Partial<PaperTrade> & { id?: string; createdAt?: string })[];
}

function migrateFromV1(persisted: unknown): PortfolioStore {
  const legacy = (persisted ?? {}) as LegacyState;
  const trades: PaperTrade[] = (legacy.trades ?? [])
    .filter((trade): trade is PaperTrade => Boolean(trade?.ticker && trade?.market))
    .map((trade) => ({
      id: trade.id ?? crypto.randomUUID(),
      ticker: trade.ticker,
      name: trade.name ?? trade.ticker,
      market: trade.market,
      side: "buy",
      quantity: trade.quantity ?? 0,
      unitPriceKrw: trade.unitPriceKrw ?? 0,
      unitPriceOriginal: trade.unitPriceOriginal ?? trade.unitPriceKrw ?? 0,
      exchangeRate: trade.exchangeRate ?? 1,
      totalKrw: trade.totalKrw ?? 0,
      createdAt: trade.createdAt ?? new Date().toISOString(),
    }));
  return { trades } as PortfolioStore;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],
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
    }),
    {
      name: "stock-pro-paper-portfolio",
      version: 2,
      migrate: (persisted, version) => (version < 2 ? migrateFromV1(persisted) : (persisted as PortfolioStore)),
    },
  ),
);
