import { useEffect, useState } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import axiosInstance from "../lib/axiosInstance";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ScoreTooltipContent from "./ui/ScroeTooltipContent";

// 점수 해석 메타 정보 함수
function getScoreMeta(score) {
  if (score <= 20) {
    return {
      label: "극단적 공포 (Extreme Fear)",
      advice: "✅ 강력한 매수 기회",
      explanation: "시장이 과도하게 빠져있을 가능성 높음",
    };
  } else if (score <= 40) {
    return {
      label: "공포 (Fear)",
      advice: "🟡 관망 or 분할 매수",
      explanation: "하락 가능성 있지만 일부 진입 고려",
    };
  } else if (score <= 60) {
    return {
      label: "중립 (Neutral)",
      advice: "⚪ 보유 or 관망",
      explanation: "불확실한 구간, 추세 확인 필요",
    };
  } else if (score <= 80) {
    return {
      label: "탐욕 (Greed)",
      advice: "🟠 수익 실현 고려",
      explanation: "가격이 과도하게 오른 구간",
    };
  } else {
    return {
      label: "극단적 탐욕 (Extreme Greed)",
      advice: "❌ 분할 매도 또는 전량 매도 고려",
      explanation: "시장 과열, 거품 주의 필요",
    };
  }
}

export default function GetVixFgiScore() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [displayScore, setDisplayScore] = useState("0.0");
  const [meta, setMeta] = useState(null);

  const scoreMotion = useMotionValue(0);
  const smoothScore = useSpring(scoreMotion, { stiffness: 70, damping: 20 });
  const smoothWidth = useTransform(smoothScore, (v) => `${Math.min(v, 100)}%`);

  useEffect(() => {
    axiosInstance
      .get("/score")
      .then((res) => {
        const target = res?.data?.score || 0;
        animate(scoreMotion, target, {
          duration: 1,
          ease: [0.22, 1, 0.36, 1],
        });
        setMeta(getScoreMeta(target));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "에러 발생");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = smoothScore.on("change", (v) => {
      setDisplayScore(v.toFixed(1));
    });
    return () => unsubscribe();
  }, [smoothScore]);

  if (loading) {
    return (
      <Card title="🔥 종합 점수">
        <p className="text-gray-400">
          <Spin />
        </p>
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
    <Card
      title="🔥 종합 점수"
      titleTooltip={<ScoreTooltipContent />}
      className="max-w-md"
    >
      <div className="text-center text-3xl font-bold text-blue-400 mb-3">
        {displayScore}
        <span className="text-xl text-blue-200"> 점</span>
      </div>

      <div className="w-full h-5 rounded-full bg-gray-700 overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-all"
          style={{
            width: smoothWidth,
            background: `linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444)`,
          }}
        />
      </div>

      {meta && (
        <div className="text-center mt-4 space-y-1">
          <p className="text-base font-semibold text-white">{meta.label}</p>
          <p className="text-sm text-blue-300">{meta.advice}</p>
          <p className="text-xs text-gray-400">{meta.explanation}</p>
        </div>
      )}

      <p className="text-sm text-gray-500 mt-3 text-center">
        (최대 점수 100 기준)
      </p>
    </Card>
  );
}
