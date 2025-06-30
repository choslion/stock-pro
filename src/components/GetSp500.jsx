// components/GetSp500.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
<<<<<<< HEAD
import Card from "./ui/Card"; // 공통 카드 컴포넌트
=======
import Card from "./ui/Card";
import Spin from "./ui/Spin";
>>>>>>> main

// 날짜 포맷 함수
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function GetSp500() {
  const [data, setData] = useState(null); // S&P500 데이터 상태
  const [error, setError] = useState(""); // 에러 메시지 상태

  useEffect(() => {
    // axios를 통한 API 호출
    axiosInstance
      .get("https://stock-index-mg9x.onrender.com/api/market/sp500")
      .then((res) => {
        const json = res.data;
        if (!json || !json.date) throw new Error("데이터 형식 오류");
        setData(json);
      })
      .catch((err) => {
        // axios는 기본적으로 err.response 또는 err.message 포함
        setError(err.response?.data?.message || err.message);
      });
  }, []);

  if (error)
    return <Card className="max-w-md text-red-400">❌ 에러: {error}</Card>;

  if (!data)
    return (
<<<<<<< HEAD
      <Card className="max-w-md text-gray-300">
        ⏳ S&P500 데이터 불러오는 중...
=======
      <Card title="📈 S&P 500 정보">
        <Spin />
>>>>>>> main
      </Card>
    );

  const isPositive = data.deviation_percent >= 0;
  const deviationColor = isPositive ? "text-green-400" : "text-red-400";

  return (
    <Card title="📈 S&P 500 정보" className="max-w-md">
      <p className="text-sm text-gray-400 mb-4">
        업데이트 날짜: {formatDate(data.date)}
      </p>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>현재 지수</span>
          <span className="font-semibold text-blue-300">
            {data.current_value.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>200일 평균선</span>
          <span className="font-semibold text-yellow-300">
            {data.ma200.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>괴리율</span>
          <span className={`font-semibold ${deviationColor}`}>
            {data.deviation_percent.toFixed(2)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
