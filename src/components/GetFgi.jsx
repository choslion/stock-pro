// components/GetFgi.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
<<<<<<< HEAD
=======
import Spin from "./ui/Spin";
>>>>>>> main

const formatDate = (isoDateStr) =>
  new Date(isoDateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function GetFgi() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosInstance
      .get("/fgi") // baseURL 자동 적용됨
      .then((res) => {
        const json = res.data;
        if (!json || !json.last_update || !json.description)
          throw new Error("데이터 형식 오류");
        setData(json);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message);
      });
  }, []);

  if (error)
    return (
      <Card title="🧭 FGI (공포 & 탐욕 지수)">
        <p className="text-red-400">에러 발생: {error}</p>
      </Card>
    );

  if (!data)
    return (
      <Card title="🧭 FGI (공포 & 탐욕 지수)">
<<<<<<< HEAD
        <p className="text-gray-400">⏳ 로딩 중...</p>
=======
        <Spin />
>>>>>>> main
      </Card>
    );

  const colorMap = {
    fear: "text-red-400",
    greed: "text-green-400",
  };
  const descriptionColor = colorMap[data.description] || "text-yellow-300";

  return (
    <Card title="🧭 FGI (공포 & 탐욕 지수)">
      <p className="text-sm text-gray-400 mb-2">
        업데이트 날짜: {formatDate(data.last_update)}
      </p>

      <div className="flex justify-between items-center mb-3">
        <span className="text-base">현재 상태:</span>
        <span className={`text-lg font-bold ${descriptionColor}`}>
          {data.description.toUpperCase()}
        </span>
      </div>

      <div>
        <p className="text-base">📈 점수</p>
        <div className="text-3xl font-extrabold text-center text-blue-300">
<<<<<<< HEAD
          {data.value}
=======
          {data.value.toFixed(2)}
>>>>>>> main
        </div>
      </div>
    </Card>
  );
}
