// components/GetSp500.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";

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
      .get("/sp500")
      .then((res) => {
        const json = res.data;
        if (!json || !json.date) throw new Error("데이터 형식 오류");
        setData(json);
      })
      .catch((err) => {
        console.log(err.response);

        setError(err.response?.data?.message || err.message);
      });
  }, []);

  if (error)
    return <Card className="max-w-md text-red-400">❌ 에러: {error}</Card>;

  if (!data)
    return (
      <Card title="📈 S&P 500 정보">
        <Spin />
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
