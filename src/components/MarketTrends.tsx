import React, { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
const MotionDiv = motion.div;
const TAB_ANIM = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};
import Card from "./ui/Card";
import StockRanking from "./StockRanking";
import InvestorTrends from "./InvestorTrends";
import Commodities from "./Commodities";
import Forex from "./Forex";
import EtfList from "./EtfList";
import { ChartBarIcon, ActivityIcon, GridIcon, TrendingUpIcon, CurrencyDollarIcon } from "./ui/Icons";
import { ClockFaceIcon } from "./ui/Icons";
import type { StockPick } from "./TimeMachine";

const TimeMachine = lazy(() => import("./TimeMachine"));

type TabId = "ranking" | "investor" | "etf" | "commodities" | "forex";

interface TabDef {
  id:       TabId;
  label:    string;
  title:    string;
  subtitle: string;
  icon:     React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: "ranking",     label: "실시간 차트",  title: "실시간 차트",  subtitle: "거래대금·거래량·등락 기준 순위", icon: ChartBarIcon       },
  { id: "investor",    label: "투자자 동향",  title: "투자자 동향",  subtitle: "기관·외국인·개인 매매 추이",    icon: ActivityIcon       },
  { id: "etf",         label: "ETF",          title: "ETF",          subtitle: "국내외 주요 ETF",              icon: GridIcon           },
  { id: "commodities", label: "원자재",       title: "원자재",       subtitle: "실시간 주요 상품 가격",         icon: TrendingUpIcon     },
  { id: "forex",       label: "환율",         title: "환율",         subtitle: "주요 통화 환율",               icon: CurrencyDollarIcon },
];

interface MarketTrendsProps {
  initialWhatIfStock?: StockPick | null;
}

export default function MarketTrends({ initialWhatIfStock }: MarketTrendsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ranking");
  const [showTimeMachine, setShowTimeMachine] = useState(Boolean(initialWhatIfStock));

  useEffect(() => {
    if (initialWhatIfStock) setShowTimeMachine(true);
  }, [initialWhatIfStock]);

  const current = TABS.find((t) => t.id === activeTab)!;

  if (showTimeMachine) {
    return (
      <Suspense fallback={null}>
        <TimeMachine
          key={initialWhatIfStock ? `${initialWhatIfStock.market}-${initialWhatIfStock.ticker}` : "default"}
          initialStock={initialWhatIfStock ?? undefined}
          onBack={() => setShowTimeMachine(false)}
        />
      </Suspense>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowTimeMachine(true)}
        className="w-full mb-5 flex items-center gap-3 rounded-2xl border border-blue-500/20
                   bg-gradient-to-r from-blue-950/50 to-slate-900/60 px-4 py-3.5
                   text-left hover:border-blue-400/40 hover:bg-blue-950/60 transition-colors"
      >
        <span className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
          <ClockFaceIcon className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">만약 그때 샀더라면</span>
            <span className="text-[10px] font-bold text-blue-300 bg-blue-500/15 px-1.5 py-0.5 rounded">NEW</span>
          </span>
          <span className="block mt-0.5 text-xs text-gray-400">과거 종목 수익을 계산해보세요</span>
        </span>
        <span className="text-gray-500" aria-hidden="true">›</span>
      </button>

      <div className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden gap-1 mb-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <MotionDiv key={activeTab} {...TAB_ANIM}>
          <Card title={current.title} subtitle={current.subtitle} icon={current.icon}>
            {activeTab === "ranking"     && <StockRanking />}
            {activeTab === "investor"    && <InvestorTrends />}
            {activeTab === "etf"         && <EtfList />}
            {activeTab === "commodities" && <Commodities />}
            {activeTab === "forex"       && <Forex />}
          </Card>
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
}
