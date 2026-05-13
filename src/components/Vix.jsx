import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";

function getVixMeta(value) {
  if (value < 15) return { label: "낮은 변동성 (안정)", color: "text-green-400" };
  if (value < 25) return { label: "보통 변동성", color: "text-yellow-300" };
  if (value < 35) return { label: "높은 변동성 (주의)", color: "text-orange-400" };
  return { label: "극단적 변동성 (위험)", color: "text-red-400" };
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
      <Card title="📉 VIX (변동성 지수)">
        <p className="text-red-400">❌ 에러 발생: {error}</p>
      </Card>
    );

  if (!data)
    return (
      <Card title="📉 VIX (변동성 지수)">
        <Spin />
      </Card>
    );

  const { label, color } = getVixMeta(parseFloat(data.value));

  return (
    <Card title="📉 VIX (변동성 지수)">
      <p className="text-sm text-gray-400">측정 날짜: {data.date}</p>
      <div className="flex justify-between items-center">
        <span className="text-base">현재 지수:</span>
        <span className={`text-2xl font-bold ${color}`}>
          {parseFloat(data.value).toFixed(2)}
        </span>
      </div>
      <p className={`text-sm mt-2 ${color}`}>● {label}</p>
    </Card>
  );
}
