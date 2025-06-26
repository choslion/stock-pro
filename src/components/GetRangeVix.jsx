// components/VixChart.jsx
import { useEffect, useState } from "react";
import axiosInstance from "../lib/axiosInstance"; // axios 인스턴스 가져오기
import Card from "./ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function VixChart() {
  const today = new Date().toISOString().slice(0, 10); // 오늘 날짜
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10); // 30일 전 날짜

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  // VIX 범위 데이터 가져오는 함수
  const fetchVixRange = async () => {
    try {
      const res = await axiosInstance.get(`/vix/range`, {
        params: { start_date: startDate, end_date: endDate },
      });

      const parsed = res.data.map((d) => ({
        date: d.date,
        value: parseFloat(d.value),
      }));

      setData(parsed);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  // 날짜 변경 시 데이터 재요청
  useEffect(() => {
    fetchVixRange();
  }, [startDate, endDate]);

  return (
    <Card title="🌪️ VIX (변동성 지수) 범위 차트" className="max-w-3xl">
      {/* 날짜 선택 필드 */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="start-date" className="text-sm text-gray-300">
            시작일:
          </label>
          <input
            id="start-date"
            type="date"
            className="bg-gray-800 text-white border px-2 py-1 rounded"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="end-date" className="text-sm text-gray-300">
            종료일:
          </label>
          <input
            id="end-date"
            type="date"
            className="bg-gray-800 text-white border px-2 py-1 rounded"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-red-400 text-sm mb-4">❌ 에러: {error}</div>
      )}

      {/* 차트 렌더링 */}
      <div className="h-80 sm:h-96">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <XAxis dataKey="date" stroke="#ccc" tick={{ fontSize: 12 }} />
              <YAxis stroke="#ccc" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#93c5fd" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-gray-400 text-sm mt-4">
            ⏳ 데이터 불러오는 중...
          </div>
        )}
      </div>
    </Card>
  );
}
