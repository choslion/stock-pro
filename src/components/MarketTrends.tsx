import React, { useState } from "react";
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

export default function MarketTrends() {
  const [activeTab, setActiveTab] = useState<TabId>("ranking");

  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div>
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
