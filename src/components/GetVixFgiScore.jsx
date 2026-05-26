import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import {
  motion,
  useSpring,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
const MotionDiv = motion.div;
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { BoltIcon } from "./ui/Icons";

const LEGEND = [
  { range: "0~20",   label: "극단적 공포", action: "매수 기회",  color: "text-green-400",  dot: "bg-green-400",  min: 0,  max: 20  },
  { range: "21~40",  label: "공포",        action: "분할 매수",  color: "text-yellow-300", dot: "bg-yellow-300", min: 21, max: 40  },
  { range: "41~60",  label: "중립",        action: "보유/관망",  color: "text-gray-300",   dot: "bg-gray-400",   min: 41, max: 60  },
  { range: "61~80",  label: "탐욕",        action: "수익 실현",  color: "text-orange-300", dot: "bg-orange-400", min: 61, max: 80  },
  { range: "81~100", label: "극단적 탐욕", action: "매도 고려",  color: "text-red-400",    dot: "bg-red-400",    min: 81, max: 100 },
];

const FGI_LABEL = {
  "extreme fear":  { ko: "극단적 공포", color: "text-green-400"  },
  "fear":          { ko: "공포",        color: "text-yellow-300" },
  "neutral":       { ko: "중립",        color: "text-gray-300"   },
  "greed":         { ko: "탐욕",        color: "text-orange-300" },
  "extreme greed": { ko: "극단적 탐욕", color: "text-red-400"    },
};

function getScoreMeta(score) {
  if (score <= 20) return { label: "극단적 공포", advice: "강력한 매수 기회",             explanation: "시장이 과도하게 빠져있을 가능성 높음" };
  if (score <= 40) return { label: "공포",        advice: "관망 또는 분할 매수",           explanation: "하락 가능성 있지만 일부 진입 고려"   };
  if (score <= 60) return { label: "중립",        advice: "보유 또는 관망",                explanation: "불확실한 구간, 추세 확인 필요"       };
  if (score <= 80) return { label: "탐욕",        advice: "수익 실현 고려",                explanation: "가격이 과도하게 오른 구간"           };
  return                  { label: "극단적 탐욕", advice: "분할 매도 또는 전량 매도 고려", explanation: "시장 과열, 거품 주의 필요"           };
}

const SUBTITLE = "FGI · RSI · MA200 · HYG 기반 종합 점수";

export default function GetVixFgiScore() {
  const scoreQ = useQuery({ queryKey: Q.score(), queryFn: fetchers.score });
  const fgiQ   = useQuery({ queryKey: Q.fgi(),   queryFn: fetchers.fgi   });

  const isLoading = scoreQ.isLoading || fgiQ.isLoading;
  const error     = scoreQ.error || fgiQ.error;

  // framer-motion animation
  const scoreMotion = useMotionValue(0);
  const smoothScore = useSpring(scoreMotion, { stiffness: 70, damping: 20 });
  const smoothWidth = useTransform(smoothScore, (v) => `${Math.min(v, 100)}%`);
  const [displayScore, setDisplayScore] = useState("0.0");

  const scoreData = scoreQ.data;
  const target    = scoreData?.score ?? 0;

  useEffect(() => {
    if (scoreData) {
      animate(scoreMotion, target, { duration: 1, ease: [0.22, 1, 0.36, 1] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    const unsub = smoothScore.on("change", (v) => setDisplayScore(v.toFixed(1)));
    return () => unsub();
  }, [smoothScore]);

  const score  = target;
  const meta   = scoreData ? getScoreMeta(score) : null;
  const detail = scoreData ?? null;
  const fgi    = fgiQ.data ?? null;

  if (isLoading) {
    return (
      <Card title="지금 투자 타이밍인가요?" subtitle={SUBTITLE} icon={BoltIcon}>
        <Spin />
      </Card>
    );
  }

  if (error && !scoreData) {
    return (
      <Card title="지금 투자 타이밍인가요?" subtitle={SUBTITLE} icon={BoltIcon}>
        <ErrorBlock message={parseError(error)} onRetry={() => { scoreQ.refetch(); fgiQ.refetch(); }} />
      </Card>
    );
  }

  const fgiDesc  = fgi?.description?.toLowerCase() ?? "";
  const fgiLabel = FGI_LABEL[fgiDesc] ?? { ko: fgiDesc, color: "text-gray-300" };

  const rsiColor   = detail?.rsi < 30 ? "text-green-400" : detail?.rsi > 70 ? "text-red-400" : "text-gray-300";
  const ma200Color = detail?.ma200_pct >= 0 ? "text-red-400" : "text-blue-400";

  return (
    <Card title="지금 투자 타이밍인가요?" subtitle={SUBTITLE} icon={BoltIcon}>
      {/* 종합 점수 */}
      <div className="text-center text-3xl font-bold text-blue-400 mb-3">
        {displayScore}
        <span className="text-xl text-blue-200"> 점</span>
      </div>

      <div className="w-full h-5 rounded-full bg-gray-700 overflow-hidden">
        <MotionDiv
          className="h-full rounded-full"
          style={{
            width: smoothWidth,
            background: `linear-gradient(to right, #22c55e, #84cc16, #eab308, #f97316, #ef4444)`,
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

      {/* 구성 지표 */}
      {detail && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-700 pt-3">
          {fgi && (
            <div className="text-center">
              <p className="text-[11px] text-gray-500">공포탐욕지수</p>
              <p className={`text-sm font-semibold mt-0.5 ${fgiLabel.color}`}>
                {fgi.value.toFixed(1)}
                <span className="text-[10px] text-gray-600 ml-0.5">/ 100</span>
              </p>
              <p className={`text-[10px] mt-0.5 ${fgiLabel.color}`}>{fgiLabel.ko}</p>
              <p className="text-[10px] text-gray-600">CNN FGI</p>
            </div>
          )}
          <div className="text-center border-x border-gray-700">
            <p className="text-[11px] text-gray-500">S&amp;P500 RSI</p>
            <p className={`text-sm font-semibold mt-0.5 ${rsiColor}`}>
              {detail.rsi?.toFixed(1)}
            </p>
            <p className={`text-[10px] mt-0.5 ${rsiColor}`}>
              {detail.rsi < 30 ? "과매도" : detail.rsi > 70 ? "과매수" : "중립"}
            </p>
            <p className="text-[10px] text-gray-600">14일 RSI</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500">MA200 대비</p>
            <p className={`text-sm font-semibold mt-0.5 ${ma200Color}`}>
              {detail.ma200_pct >= 0 ? "+" : ""}{detail.ma200_pct?.toFixed(1)}%
            </p>
            <p className="text-[10px] mt-0.5 text-gray-500">
              {detail.ma200_pct >= 0 ? "추세 상방" : "추세 하방"}
            </p>
            <p className="text-[10px] text-gray-600">S&amp;P500 200일선</p>
          </div>
        </div>
      )}

      {/* 레전드 */}
      <div className="mt-4 border-t border-gray-700 pt-3 space-y-2">
        {LEGEND.map((row) => {
          const isActive = score >= row.min && score <= row.max;
          return (
            <div
              key={row.range}
              className={`flex items-center gap-2 text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-35"}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${row.dot} ${isActive ? "ring-2 ring-white/50" : ""}`} />
              <span className="w-14 text-gray-500">{row.range}</span>
              <span className={`w-20 font-medium ${row.color}`}>{row.label}</span>
              <span className="text-gray-400">{row.action}</span>
            </div>
          );
        })}
      </div>

      {/* 투자 유의문구 */}
      <p className="mt-4 text-[10px] text-gray-600 leading-relaxed border-t border-gray-800 pt-3">
        ※ 본 점수는 시장 심리 참고용 지표이며, 투자 판단의 근거로 사용하지 마세요. 투자 손실에 대한 책임은 투자자 본인에게 있습니다.
      </p>
    </Card>
  );
}
