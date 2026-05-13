import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import SummaryBanner from "./ui/SummaryBanner";

function getVixMeta(value) {
  if (value < 15) return {
    label: "낮은 변동성 (안정)", color: "text-green-400",
    banner: { text: "🟢 시장은 안정적입니다 — 투자하기 좋은 환경입니다", type: "safe" },
  };
  if (value < 25) return {
    label: "보통 변동성", color: "text-yellow-300",
    banner: { text: "🟡 보통 수준의 변동성입니다 — 신중하게 접근하세요", type: "caution" },
  };
  if (value < 35) return {
    label: "높은 변동성 (주의)", color: "text-orange-400",
    banner: { text: "🟠 시장 불안감이 높습니다 — 분할 매수를 고려하세요", type: "warning" },
  };
  return {
    label: "극단적 변동성 (위험)", color: "text-red-400",
    banner: { text: "🔴 시장이 매우 불안정합니다 — 현금 비중을 높이세요", type: "danger" },
  };
}

export default function Vix() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosInstance
      .get("/vix")
      .then((res) => setData(res.data))
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
      });
  }, []);

  if (error)
    return (
      <Card title="🌊 시장 불안 지수" subtitle="CBOE Volatility Index (VIX)">
        <p className="text-red-400">❌ 에러 발생: {error}</p>
      </Card>
    );

  if (!data)
    return (
      <Card title="🌊 시장 불안 지수" subtitle="CBOE Volatility Index (VIX)">
        <Spin />
      </Card>
    );

  const { label, color, banner } = getVixMeta(parseFloat(data.value));

  return (
    <Card title="🌊 시장 불안 지수" subtitle="CBOE Volatility Index (VIX)">
      <p className="text-sm text-gray-400">측정 날짜: {data.date}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-base">현재 지수:</span>
        <span className={`text-2xl font-bold ${color}`}>
          {parseFloat(data.value).toFixed(2)}
        </span>
      </div>
      <p className={`text-sm mt-2 ${color}`}>● {label}</p>
      <SummaryBanner text={banner.text} type={banner.type} />
    </Card>
  );
}
