import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";

const FILTERS = [
  { id: "amount", label: "거래대금" },
  { id: "volume", label: "거래량" },
  { id: "rising", label: "급상승" },
  { id: "falling", label: "급하락" },
];

function formatPrice(price) {
  return price.toLocaleString("ko-KR") + "원";
}

function ChangeRate({ value }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isNeutral
    ? "text-gray-400"
    : isPositive
    ? "text-red-400"   // 한국 증시 관례: 상승=빨강
    : "text-blue-400"; // 한국 증시 관례: 하락=파랑
  return (
    <span className={`font-semibold ${color}`}>
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export default function StockRanking() {
  const [filter, setFilter] = useState("amount");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    axiosInstance
      .get("/stocks/ranking", { params: { type: filter } })
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === f.id
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spin />
      ) : error ? (
        <p className="text-red-400 text-sm text-center py-4">❌ {error}</p>
      ) : (
        <div>
          <div className="grid grid-cols-12 text-xs text-gray-500 px-2 pb-2 border-b border-gray-700">
            <span className="col-span-1">순위</span>
            <span className="col-span-6">종목명</span>
            <span className="col-span-2 text-right">현재가</span>
            <span className="col-span-3 text-right">등락률</span>
          </div>

          <div className="divide-y divide-gray-700/50">
            {data.map((stock) => (
              <div
                key={stock.ticker}
                className="grid grid-cols-12 items-center px-2 py-2.5 hover:bg-gray-700/30 transition-colors"
              >
                <span className="col-span-1 text-gray-500 text-sm">{stock.rank}</span>
                <span className="col-span-6 text-sm font-medium truncate pr-2">
                  {stock.name}
                </span>
                <span className="col-span-2 text-right text-sm text-gray-300">
                  {formatPrice(stock.price)}
                </span>
                <span className="col-span-3 text-right text-sm">
                  <ChangeRate value={stock.change_rate} />
                </span>
              </div>
            ))}

            {data.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">
                데이터가 없습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
