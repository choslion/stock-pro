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
  { id: "market",    label: "시장",  icon: "📊", desc: "공포/탐욕 · VIX · S&P500" },
  { id: "chart",     label: "차트",  icon: "📈", desc: "실시간 순위 · 투자자 동향" },
  { id: "theme",     label: "테마",  icon: "🎯", desc: "분야별 동향 · ETF 순위" },
  { id: "watchlist", label: "관심",  icon: "⭐", desc: "개발자의 관심종목" },
];

function SectionContent({ activeTab }) {
  return (
    <>
      {activeTab === "market" && (
        <div className="space-y-6">
          <GetVixFgiScore />
          <GetFgi />
          <Vix />
          <GetRangeVix />
          <GetSp500 />
        </div>
      )}
      {activeTab === "chart"     && <MarketTrends />}
      {activeTab === "theme"     && (
        <div className="space-y-6">
          <ThemeSectors />
          <EtfList />
        </div>
      )}
      {activeTab === "watchlist" && <Watchlist />}
    </>
  );
}

export default function StockIndexDashboard() {
  const [activeTab, setActiveTab] = useState("market");

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ════════════════════════════════
          PC (lg+): 사이드바 레이아웃
          ════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">

        {/* 사이드바 */}
        <aside className="w-56 shrink-0 sticky top-0 h-screen
                          bg-gray-900 border-r border-gray-800
                          flex flex-col">
          {/* 로고 */}
          <div className="px-5 py-6 border-b border-gray-800">
            <p className="text-xl font-extrabold tracking-tight">📊 주식 현황</p>
            <p className="text-xs text-gray-500 mt-1">실시간 시장 데이터</p>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl
                              transition-all duration-150 group
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                              ${isActive
                                ? "bg-blue-600/20 text-white"
                                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}
                >
                  {/* 활성 인디케이터 */}
                  <span className={`mt-0.5 shrink-0 w-1 h-5 rounded-full transition-all
                                    ${isActive ? "bg-blue-400" : "bg-transparent group-hover:bg-gray-600"}`} />
                  <span className="text-lg leading-none mt-0.5">{tab.icon}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className={`text-sm font-semibold ${isActive ? "text-white" : ""}`}>
                      {tab.label}
                    </span>
                    <span className="text-[11px] text-gray-500 leading-tight">{tab.desc}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* 하단 버전 */}
          <div className="px-5 py-4 border-t border-gray-800 text-xs text-gray-600">
            stock-pro
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6 xl:p-10">
          <div className="max-w-3xl mx-auto">
            <SectionContent activeTab={activeTab} />
          </div>
        </main>
      </div>

      {/* ════════════════════════════════
          모바일: 하단 탭바 레이아웃
          ════════════════════════════════ */}
      <div className="lg:hidden">
        {/* 모바일 헤더 */}
        <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
          <h1 className="text-lg font-bold text-center">📊 주식 상황 확인</h1>
        </header>

        {/* 컨텐츠 */}
        <main className="p-4 pb-24 space-y-6">
          <SectionContent activeTab={activeTab} />
        </main>

        {/* 하단 탭바 */}
        <nav
          aria-label="주요 섹션"
          className="fixed bottom-0 inset-x-0 z-20
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
                className={`relative flex-1 flex flex-col items-center pt-2 pb-4 gap-1
                            transition-all duration-200
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400
                            ${isActive ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-b-full bg-blue-400" />
                )}
                <span className={`flex items-center justify-center w-10 h-7 rounded-xl text-lg
                                  transition-all duration-200
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

    </div>
  );
}
