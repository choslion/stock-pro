import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";

const EMOJI_MAP = {
  "운수장비": "🚗", "음식료품": "🍱", "섬유의복": "👕", "화학": "⚗️",
  "금융업": "🏦", "건설업": "🏗️", "전기전자": "💻", "철강금속": "⚙️",
  "기계": "🔧", "의약품": "💊", "서비스업": "🏢", "유통업": "🛒",
  "통신업": "📱", "보험": "🛡️", "증권": "📈", "은행": "🏦",
  "비금속광물": "🪨", "종이목재": "📄", "전기가스업": "⚡", "운수창고": "📦",
  "의료정밀": "🔬", "농업": "🌾", "수산업": "🐟", "광업": "⛏️",
};

function getEmoji(name) {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (name.includes(key)) return emoji;
  }
  return "📊";
}

function now() {
  return new Date().toLocaleString("ko-KR", {
    month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric",
  });
}

export default function TrendingSectors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError("");
    axiosInstance
      .get("/sectors")
      .then((res) => setData(res.data))
      .catch((err) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [retryCount]);

  return (
    <div className="min-h-[480px]">
      {loading ? (
        <div className="flex items-center justify-center h-[480px]">
          <Spin />
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={() => setRetryCount((c) => c + 1)} />
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">국내 · {now()} 기준</p>
          <div className="divide-y divide-gray-700/50">
            {data.map((sector, i) => {
              const isPositive = sector.change_rate > 0;
              const isNeutral = sector.change_rate === 0;
              const rateColor = isNeutral ? "text-gray-400" : isPositive ? "text-red-400" : "text-blue-400";
              return (
                <div
                  key={sector.name}
                  className="flex items-center gap-4 py-3 px-1 hover:bg-gray-700/20 transition-colors"
                >
                  <span className="text-blue-400 font-bold text-sm w-5 shrink-0 text-center">
                    {i + 1}
                  </span>
                  <span className="text-xl w-7 shrink-0 text-center">
                    {getEmoji(sector.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sector.name}</p>
                    <p className="text-xs text-gray-500">
                      {sector.total}개 중 {sector.rising}개 종목 상승
                    </p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${rateColor}`}>
                    {isPositive ? "+" : ""}{sector.change_rate.toFixed(1)}%
                  </span>
                </div>
              );
            })}
            {data.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">데이터가 없습니다.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
