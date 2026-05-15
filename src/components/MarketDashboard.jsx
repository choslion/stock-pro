import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
const MotionDiv = motion.div;
const TAB_ANIM = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: "easeOut" },
};
import GetUsIndices from "./GetUsIndices";
import GetVixFgiScore from "./GetVixFgiScore";
import GetRangeVix from "./GetRangeVix";
import TrendingUsSectors from "./TrendingUsSectors";
import GetKospi from "./GetKospi";
import GetKrScore from "./GetKrScore";
import TrendingSectors from "./TrendingSectors";
import Card from "./ui/Card";
import { ChartBarIcon } from "./ui/Icons";

const TABS = [
  { id: "kr", label: "국내" },
  { id: "us", label: "해외" },
];

export default function MarketDashboard() {
  const [tab, setTab] = useState("kr");

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? "text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "kr" && (
          <MotionDiv key="kr" {...TAB_ANIM} className="space-y-6">
            <GetKospi />
            <GetKrScore />
            <Card title="업종별 동향" subtitle="KOSPI 업종 등락률" icon={ChartBarIcon}>
              <TrendingSectors />
            </Card>
          </MotionDiv>
        )}
        {tab === "us" && (
          <MotionDiv key="us" {...TAB_ANIM} className="space-y-6">
            <GetUsIndices />
            <GetVixFgiScore />
            <Card title="업종별 동향" subtitle="S&P 500 섹터 ETF 등락률" icon={ChartBarIcon}>
              <TrendingUsSectors />
            </Card>
            <GetRangeVix />
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
