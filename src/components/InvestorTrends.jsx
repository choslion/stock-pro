import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";

const SUB_TABS = [
  { id: "marcap", label: "시가총액 상위" },
  { id: "hot",    label: "거래대금 상위" },
];

function ChangeRate({ value }) {
  const color = value === 0 ? "text-gray-400" : value > 0 ? "text-red-400" : "text-blue-400";
  return (
    <span className={`text-sm font-semibold ${color}`}>
      {value > 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function formatWon(value) {
  if (!value) return "-";
  if (value >= 1_000_000_000_000) return (value / 1_000_000_000_000).toFixed(1) + "조";
  if (value >= 100_000_000) return Math.round(value / 100_000_000) + "억";
  return value.toLocaleString("ko-KR");
}

export default function InvestorTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subTab, setSubTab] = useState("marcap");

  useEffect(() => {
    axiosInstance
      .get("/investor-trends")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;
  if (error) return <p className="text-red-400 text-sm text-center py-4">❌ {error}</p>;

  const rows = data?.[subTab] ?? [];
  const subLabel = subTab === "marcap" ? "시가총액" : "거래대금";

  return (
    <div>
      <div className="flex gap-3 mb-4">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              subTab === t.id
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
        <span className="col-span-1">순위</span>
        <span className="col-span-5">종목명</span>
        <span className="col-span-3 text-right">{subLabel}</span>
        <span className="col-span-3 text-right">등락률</span>
      </div>

      <div className="divide-y divide-gray-700/50">
        {rows.map((row) => (
          <div
            key={row.ticker}
            className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
          >
            <span className="col-span-1 text-blue-400 font-bold text-sm">{row.rank}</span>
            <div className="col-span-5 pr-2">
              <p className="text-sm font-medium truncate">{row.name}</p>
              <p className="text-xs text-gray-500">{row.price.toLocaleString("ko-KR")}원</p>
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
          <p className="text-gray-500 text-center py-6 text-sm">데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
