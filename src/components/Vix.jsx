// components/Vix.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
<<<<<<< HEAD
=======
import Spin from "./ui/Spin";
>>>>>>> main

export default function Vix() {
  const [data, setData] = useState(null); // VIX 데이터
  const [error, setError] = useState(""); // 에러 메시지

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    axiosInstance
      .get("/vix") // baseURL은 axiosInstance에 정의되어 있음
      .then((res) => setData(res.data))
      .catch((err) => {
        // 서버에서 응답이 있으면 그 메시지를, 없으면 기본 메시지 사용
        setError(err.response?.data?.message || err.message);
      });
  }, []);

  // 에러 상태 UI
  if (error)
    return (
      <Card title="📉 VIX (변동성 지수)">
        <p className="text-red-400">❌ 에러 발생: {error}</p>
      </Card>
    );

  // 로딩 상태 UI
  if (!data)
    return (
      <Card title="📉 VIX (변동성 지수)">
<<<<<<< HEAD
        <p className="text-gray-400">⏳ 로딩 중...</p>
=======
        <Spin />
>>>>>>> main
      </Card>
    );

  // 정상 렌더링
  return (
    <Card title="📉 VIX (변동성 지수)">
      <p className="text-sm text-gray-400">측정 날짜: {data.date}</p>
      <div className="flex justify-between items-center">
        <span className="text-base">현재 지수:</span>
        <span className="text-2xl font-bold text-green-400">
          {parseFloat(data.value).toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-green-300 mt-2">● 낮은 변동성 (안정)</p>
    </Card>
  );
}
