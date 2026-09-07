import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import type { InvestorTrendsData, InvestorTrendStock } from "../types/api";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

type Investor = keyof InvestorTrendsData["investors"];
type Side = "net_buy" | "net_sell";

const INVESTORS: Array<{ id: Investor; label: string }> = [
  { id: "foreign",     label: "외국인" },
  { id: "institution", label: "기관" },
  { id: "individual",  label: "개인" },
];

const SIDES: Array<{ id: Side; label: string }> = [
  { id: "net_buy",  label: "순매수" },
  { id: "net_sell", label: "순매도" },
];

function ChangeRate({ value }: { value: number }) {
  const color =
    value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function formatWon(value: number): string {
  const amount = Math.abs(value);
  if (amount >= 1_000_000_000_000) return (amount / 1_000_000_000_000).toFixed(1) + "조원";
  if (amount >= 100_000_000)       return Math.round(amount / 100_000_000).toLocaleString("ko-KR") + "억원";
  if (amount >= 10_000)            return Math.round(amount / 10_000).toLocaleString("ko-KR") + "만원";
  return amount.toLocaleString("ko-KR") + "원";
}

function formatDate(value: string | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}`;
}

export default function InvestorTrends() {
  const [investor, setInvestor] = useState<Investor>("foreign");
  const [side, setSide] = useState<Side>("net_buy");

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.investorTrends(),
    queryFn:  fetchers.investorTrends,
  });

  const rows: InvestorTrendStock[] = (data?.investors?.[investor]?.[side] ?? []).slice(0, 20);
  const investorLabel = INVESTORS.find((item) => item.id === investor)?.label ?? "";
  const sideLabel = SIDES.find((item) => item.id === side)?.label ?? "";
  const amountColor = side === "net_buy" ? "text-red-400" : "text-blue-400";

  return (
    <div className="min-h-[480px]">
      {isLoading ? (
        <div className="flex items-center justify-center h-[480px]">
          <Spin />
        </div>
      ) : error && !data ? (
        <ErrorBlock message={parseError(error)} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end mb-5">
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-500">투자자</p>
              <ScrollTabs
                tabs={INVESTORS}
                activeId={investor}
                onChange={(id) => setInvestor(id as Investor)}
                ariaLabel="투자자 선택"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-gray-500">매매 구분</p>
              <div className="inline-flex rounded-full bg-gray-700/40 p-0.5" role="group" aria-label="순매수 또는 순매도">
                {SIDES.map((item) => {
                  const active = side === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSide(item.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                        ${active
                          ? item.id === "net_buy" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                          : "text-gray-400 hover:text-gray-200"
                        }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-2 flex items-end justify-between gap-3 px-2">
            <p className="text-sm font-semibold text-gray-200">{investorLabel} {sideLabel} 상위</p>
            <p className="shrink-0 text-[11px] text-gray-500">{formatDate(data?.as_of)} 기준</p>
          </div>

          <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-700 text-xs text-gray-500">
            <span className="w-8 shrink-0">순위</span>
            <span className="flex-1">종목</span>
            <span className="shrink-0">{sideLabel}액</span>
          </div>

          <div className="divide-y divide-gray-700/50">
            {rows.map((row) => (
              <div
                key={row.ticker}
                className="flex items-center gap-2 px-2 py-3 hover:bg-gray-700/30 transition-colors"
              >
                <span className="w-8 shrink-0 text-gray-500 text-xs tabular-nums">
                  {row.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-100">{row.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums">
                    <span className="text-gray-500">
                      {row.price > 0 ? `${row.price.toLocaleString("ko-KR")}원` : "현재가 미제공"}
                    </span>
                    <ChangeRate value={row.change_rate} />
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-semibold tabular-nums ${amountColor}`}>
                  {formatWon(row.net_amount)}
                </p>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">
                해당 조건의 데이터가 없습니다.
              </p>
            )}
          </div>

          <p className="mt-4 border-t border-gray-800 pt-3 text-[11px] leading-relaxed text-gray-500">
            KRX 최종 집계 기준이며 장중에는 직전 거래일 데이터가 표시될 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
