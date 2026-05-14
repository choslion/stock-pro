import { useState } from "react";
import Vix from "./Vix";
import GetRangeVix from "./GetRangeVix";
import GetSp500 from "./GetSp500";
import GetFgi from "./GetFgi";
import GetVixFgiScore from "./GetVixFgiScore";
import MarketTrends from "./MarketTrends";
import EtfList from "./EtfList";
import Watchlist from "./Watchlist";
import ThemeSectors from "./ThemeSectors";

const NAV_TABS = [
  { id: "market",    label: "시장",  icon: "📊" },
  { id: "chart",     label: "차트",  icon: "📈" },
  { id: "theme",     label: "테마",  icon: "🎯" },
  { id: "watchlist", label: "관심",  icon: "⭐" },
];

export default function StockIndexDashboard() {
  const [activeTab, setActiveTab] = useState("market");

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── 모바일 헤더 (lg에선 숨김) ── */}
      <header className="lg:hidden sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-bold text-center">📊 주식 상황 확인</h1>
      </header>

      {/* ── 모바일: 활성 탭 섹션만 표시 ── */}
      <main className="lg:hidden p-4 pb-24 space-y-6">
        {activeTab === "market" && (
          <>
            <GetVixFgiScore />
            <GetFgi />
            <Vix />
            <GetRangeVix />
            <GetSp500 />
          </>
        )}
        {activeTab === "chart" && <MarketTrends />}
        {activeTab === "theme" && (
          <>
            <ThemeSectors />
            <EtfList />
          </>
        )}
        {activeTab === "watchlist" && <Watchlist />}
      </main>

      {/* ── PC(lg+): 2컬럼 그리드 전체 표시 ── */}
      <main className="hidden lg:block p-6 xl:p-10 max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-bold my-8 text-center">📊 주식 상황 확인</h1>

        <div className="grid grid-cols-2 gap-6 items-start">
          {/* 좌 컬럼: 지표 + 관심종목 */}
          <div className="space-y-6">
            <GetVixFgiScore />
            <GetFgi />
            <Vix />
            <GetRangeVix />
            <GetSp500 />
            <Watchlist />
          </div>
          {/* 우 컬럼: 차트 + ETF */}
          <div className="space-y-6">
            <MarketTrends />
            <EtfList />
          </div>
        </div>

        {/* 풀 width: 테마 */}
        <div className="mt-6">
          <ThemeSectors />
        </div>
      </main>

      {/* ── 모바일 하단 탭바 ── */}
      <nav
        aria-label="주요 섹션"
        className="lg:hidden fixed bottom-0 inset-x-0 z-20
                   bg-gray-900 border-t-2 border-gray-700
                   flex shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center pt-2 pb-4 gap-1 transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400
                ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {/* 활성 탭 상단 인디케이터 */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b-full bg-blue-400" />
              )}
              {/* 활성 탭 아이콘 배경 */}
              <span className={`flex items-center justify-center w-10 h-7 rounded-xl text-lg transition-all duration-200
                ${isActive ? "bg-blue-500/20 scale-110" : ""}`}>
                {tab.icon}
              </span>
              <span className={`text-[11px] font-semibold tracking-wide transition-colors
                ${isActive ? "text-blue-300" : "text-gray-500"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
