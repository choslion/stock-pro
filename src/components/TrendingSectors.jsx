import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Spin from "./ui/Spin";

function ChangeRateBadge({ value }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const textColor = isNeutral
    ? "text-gray-400"
    : isPositive
    ? "text-red-400"
    : "text-blue-400";
  const bgColor = isNeutral
    ? "bg-gray-700"
    : isPositive
    ? "bg-red-900/40"
    : "bg-blue-900/40";
  return (
    <span className={`text-sm font-bold px-2 py-0.5 rounded ${bgColor} ${textColor}`}>
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export default function TrendingSectors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosInstance
      .get("/sectors")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  if (error)
    return <p className="text-red-400 text-sm text-center py-4">❌ {error}</p>;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">KOSPI 업종별 평균 등락률 기준</p>
      <div className="space-y-1.5">
        {data.map((sector, i) => (
          <div
            key={sector.name}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-5 shrink-0">{i + 1}</span>
              <div>
                <p className="text-sm font-medium">{sector.name}</p>
                <p className="text-xs text-gray-500">
                  {sector.total}개 중 {sector.rising}개 상승
                </p>
              </div>
            </div>
            <ChangeRateBadge value={sector.change_rate} />
          </div>
        ))}

        {data.length === 0 && (
          <p className="text-gray-500 text-center py-6 text-sm">
            데이터가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
