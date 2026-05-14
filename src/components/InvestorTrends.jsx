import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import ScrollTabs from "./ui/ScrollTabs";

const SUB_TABS = [
  { id: "marcap", label: "시가총액 상위" },
  { id: "hot", label: "거래대금 상위" },
];

function ChangeRate({ value }) {
  const color =
    value === 0
      ? "text-gray-400"
      : value > 0
        ? "text-red-400"
        : "text-blue-400";
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {value > 0 ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function formatWon(value) {
  if (!value) return "-";
  if (value >= 1_000_000_000_000)
    return (value / 1_000_000_000_000).toFixed(1) + "조";
  if (value >= 100_000_000) return Math.round(value / 100_000_000) + "억";
  return value.toLocaleString("ko-KR");
}

export default function InvestorTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState("marcap");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    axiosInstance
      .get("/investor-trends")
      .then((res) => setData(res.data))
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  const rows = data?.[subTab] ?? [];
  const subLabel = subTab === "marcap" ? "시가총액" : "거래대금";

  return (
    <div className="min-h-[480px]">
      {loading ? (
        <div className="flex items-center justify-center h-[480px]">
          <Spin />
        </div>
      ) : error ? (
        <ErrorBlock
          message={error}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
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

          <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
            <span className="col-span-2 whitespace-nowrap">순위</span>
            <span className="col-span-4">종목명</span>
            <span className="col-span-3 text-right">{subLabel}</span>
            <span className="col-span-3 text-right">등락률</span>
          </div>

          <div className="divide-y divide-gray-700/50">
            {rows.map((row) => (
              <div
                key={row.ticker}
                className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
              >
                <span className="col-span-2 text-blue-400 font-bold text-sm">
                  {row.rank}
                </span>
                <div className="col-span-4 pr-2">
                  <p className="text-sm font-medium truncate">{row.name}</p>
                  <p className="text-xs text-gray-500">
                    {row.price.toLocaleString("ko-KR")}원
                  </p>
                </div>
                <span className="col-span-3 text-right text-sm text-gray-300">
                  {subTab === "marcap"
                    ? formatWon(row.marcap)
                    : formatWon(row.amount)}
                </span>
                <span className="col-span-3 text-right">
                  <ChangeRate value={row.change_rate} />
                </span>
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
