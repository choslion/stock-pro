import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

const SUB_TABS = [
  { id: "marcap", label: "시가총액 상위" },
  { id: "hot",    label: "거래대금 상위" },
];

function ChangeRate({ value }) {
  const color =
    value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function formatWon(value) {
  if (!value) return "-";
  if (value >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + "조";
  if (value >= 100_000_000)       return Math.round(value / 100_000_000) + "억";
  return value.toLocaleString("ko-KR");
}

export default function InvestorTrends() {
  const [subTab, setSubTab] = useState("marcap");

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.investorTrends(),
    queryFn:  fetchers.investorTrends,
  });

  const rows = data?.[subTab] ?? [];

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
          <div className="mb-4">
            <ScrollTabs
              tabs={SUB_TABS}
              activeId={subTab}
              onChange={setSubTab}
              ariaLabel="투자자 동향 필터"
            />
          </div>

          <div className="flex items-center gap-2 px-2 pb-2 border-b border-gray-700 text-xs text-gray-500">
            <span className="w-8 shrink-0">순위</span>
            <span className="flex-1">종목명</span>
            <span className="shrink-0">등락률</span>
          </div>

          <div className="divide-y divide-gray-700/50">
            {rows.map((row) => (
              <div
                key={row.ticker}
                className="px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
              >
                {/* 1행: 순위 + 종목명 + 등락률 */}
                <div className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-gray-500 text-xs tabular-nums">
                    {row.rank}
                  </span>
                  <p className="flex-1 text-sm font-medium">{row.name}</p>
                  <span className="shrink-0">
                    <ChangeRate value={row.change_rate} />
                  </span>
                </div>
                {/* 2행: 현재가(좌) + 시가총액·거래대금(우) */}
                <div className="flex items-center pl-10 mt-0.5">
                  <p className="flex-1 text-[11px] text-gray-500 tabular-nums">
                    {row.price.toLocaleString("ko-KR")}원
                  </p>
                  <p className="shrink-0 text-[11px] text-gray-500 tabular-nums">
                    {subTab === "marcap" ? formatWon(row.marcap) : formatWon(row.amount)}
                  </p>
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">
                데이터가 없습니다.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
