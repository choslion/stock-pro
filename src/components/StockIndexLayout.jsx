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
import { ChartBarIcon, TrendingUpIcon, GridIcon, BookmarkIcon } from "./ui/Icons";

const NAV_TABS = [
  { id: "market",    label: "시장",  icon: ChartBarIcon   },
  { id: "chart",     label: "차트",  icon: TrendingUpIcon },
  { id: "theme",     label: "테마",  icon: GridIcon       },
  { id: "watchlist", label: "관심",  icon: BookmarkIcon   },
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

      {/* ════════ PC (lg+): 사이드바 레이아웃 ════════ */}
      <div className="hidden lg:flex min-h-screen">

        {/* 사이드바 */}
        <aside className="w-44 shrink-0 sticky top-0 h-screen
                          bg-gray-900/80 border-r border-gray-800/60
                          flex flex-col backdrop-blur-sm">
          {/* 로고 */}
          <div className="px-4 py-5 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-bold tracking-tight text-white">stock-pro</p>
            </div>
            <p className="text-[11px] text-gray-600 mt-0.5 pl-6">실시간 시장 데이터</p>
          </div>

          {/* 네비게이션 */}
          <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
            {NAV_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                              transition-all duration-150
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                              ${isActive
                                ? "bg-blue-600/15 text-blue-300"
                                : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 하단 버전 */}
          <div className="px-4 py-3 border-t border-gray-800/60 text-[11px] text-gray-700">
            v1.0
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto p-6 xl:p-10">
          <div className="max-w-3xl mx-auto">
            <SectionContent activeTab={activeTab} />
          </div>
        </main>
      </div>

      {/* ════════ 모바일: 하단 탭바 레이아웃 ════════ */}
      <div className="lg:hidden">
        {/* 모바일 헤더 */}
        <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800/60 px-4 py-2.5">
          <div className="flex items-center justify-center gap-1.5">
            <ChartBarIcon className="w-3.5 h-3.5 text-blue-400" />
            <h1 className="text-sm font-semibold text-white tracking-tight">stock-pro</h1>
          </div>
        </header>

        {/* 컨텐츠 */}
        <main className="p-4 pb-20 space-y-6">
          <SectionContent activeTab={activeTab} />
        </main>

        {/* 하단 탭바 */}
        <nav
          aria-label="주요 섹션"
          className="fixed bottom-0 inset-x-0 z-20
                     bg-gray-900/95 border-t border-gray-800/60
                     flex shadow-[0_-2px_16px_rgba(0,0,0,0.4)]
                     backdrop-blur-sm"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex-1 flex flex-col items-center pt-2 pb-4 gap-1
                            transition-all duration-200
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400
                            ${isActive ? "text-blue-400" : "text-gray-600 hover:text-gray-400"}`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-b-full bg-blue-400" />
                )}
                <Icon className="w-5 h-5" />
                <span className={`text-[10px] font-medium ${isActive ? "text-blue-400" : "text-gray-600"}`}>
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
