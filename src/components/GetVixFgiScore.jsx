import { useEffect, useState } from "react";
import {
  useSpring,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";

export default function GetVixFgiScore() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState("0.0");

  const scoreMotion = useMotionValue(0);
  const smoothScore = useSpring(scoreMotion, { stiffness: 70, damping: 20 });
  const smoothWidth = useTransform(smoothScore, (v) => `${Math.min(v, 100)}%`);

  useEffect(() => {
    axiosInstance
      .get("/score")
      .then((res) => {
        const target = res?.data?.score || 0;
        // 슈웅~ 올라가는 애니메이션
        animate(scoreMotion, target, {
          duration: 1,
          ease: [0.22, 1, 0.36, 1], // easeOutCubic 스타일
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "에러 발생");
        setLoading(false);
      });
  }, []);

  // 숫자 텍스트 업데이트
  useEffect(() => {
    const unsubscribe = smoothScore.on("change", (v) => {
      setDisplayScore(v.toFixed(1));
    });
    return () => unsubscribe();
  }, [smoothScore]);

  if (loading) {
    return (
      <Card title="🔥 종합 점수">
        <p className="text-gray-400">⏳ 로딩 중...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="🔥 종합 점수">
        <p className="text-red-400">❌ {error}</p>
      </Card>
    );
  }

  return (
    <Card title="🔥 종합 점수" className="max-w-md">
      <div className="text-center text-3xl font-bold text-blue-400 mb-3">
        {displayScore}
        <span className="text-xl text-blue-200">점</span>
      </div>

      <div className="w-full h-5 rounded-full bg-gray-700 overflow-hidden">
        <motion.div
          className="h-full bg-blue-500"
          style={{ width: smoothWidth }}
        />
      </div>

      <p className="text-sm text-gray-400 mt-2 text-center">
        (최대 점수 100 기준)
      </p>
    </Card>
  );
}
