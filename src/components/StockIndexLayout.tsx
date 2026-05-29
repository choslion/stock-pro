import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
const MotionDiv = motion.div;
const MarketDashboard = lazy(() => import("./MarketDashboard"));
const MarketTrends    = lazy(() => import("./MarketTrends"));
const Watchlist       = lazy(() => import("./Watchlist"));
const HelpGuide       = lazy(() => import("./HelpGuide"));
const AIChatSection   = lazy(() => import("./AIChatSection"));
import SearchModal from "./SearchModal";
import { ChartBarIcon, TrendingUpIcon, BookmarkIcon, BookOpenIcon, MagnifyingGlassIcon, SparklesIcon, QuestionMarkCircleIcon, XMarkIcon } from "./ui/Icons";
import { Q, fetchers } from "../lib/queries";
import { THEMES } from "../config/themes";
import { WATCHLIST } from "../config/watchlist";

const _KR_LIST    = WATCHLIST.filter((w) => w.market === "KR");
const _KR_TICKERS = _KR_LIST.map((w) => w.ticker);
const _KR_NAMES   = _KR_LIST.map((w) => w.name);
const _US_TICKERS = WATCHLIST.filter((w) => w.market === "US").map((w) => w.ticker);
const _WL_PARAMS: Record<string, string> = {};
if (_KR_TICKERS.length) { _WL_PARAMS.kr = _KR_TICKERS.join(","); _WL_PARAMS.kr_names = _KR_NAMES.join(","); }
if (_US_TICKERS.length) _WL_PARAMS.us = _US_TICKERS.join(",");

type TabId = "market" | "chart" | "watchlist" | "ai";

interface NavTab {
  id:    TabId;
  label: string;
  icon:  React.ComponentType<{ className?: string }>;
}

const NAV_TABS: NavTab[] = [
  { id: "market",    label: "시장", icon: ChartBarIcon   },
  { id: "chart",     label: "차트", icon: TrendingUpIcon },
  { id: "watchlist", label: "관심", icon: BookmarkIcon   },
  { id: "ai",        label: "AI",   icon: SparklesIcon   },
];

const TAB_ANIM = {
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

function SectionContent({ activeTab }: { activeTab: TabId }) {
  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        <MotionDiv key={activeTab} {...TAB_ANIM}>
          {activeTab === "market"    && <MarketDashboard />}
          {activeTab === "chart"     && <MarketTrends />}
          {activeTab === "watchlist" && <Watchlist />}
          {activeTab === "ai"        && <AIChatSection />}
        </MotionDiv>
      </AnimatePresence>
    </Suspense>
  );
}

const MotionBackdrop = motion.div;
const MotionPanel    = motion.div;

function HelpModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const isDesktop = window.innerWidth >= 1024;

  const panelAnim = isDesktop
    ? { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.97 }, transition: { duration: 0.18, ease: "easeOut" as const } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" }, transition: { type: "spring" as const, stiffness: 300, damping: 30 } };

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-end">
      <MotionBackdrop
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      />
      <MotionPanel
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        className="relative z-10 flex flex-col
                   w-full h-[88%] rounded-t-2xl
                   lg:h-full lg:rounded-none lg:w-[480px] lg:border-l lg:border-gray-700/60
                   bg-gray-900 overflow-hidden"
        {...panelAnim}
      >
        {/* 모바일 드래그 핸들 */}
        <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800/60 bg-gray-900/95 backdrop-blur-sm">
          <span id="help-modal-title" className="text-sm font-semibold text-white">도움말</span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
            aria-label="도움말 닫기"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Suspense fallback={null}>
            <HelpGuide />
          </Suspense>
        </div>
      </MotionPanel>
    </div>
  );
}

export default function StockIndexDashboard() {
  const [activeTab, setActiveTab]   = useState<TabId>("market");
  const [showSearch, setShowSearch] = useState(false);
  const [showHelp, setShowHelp]     = useState(false);
  const queryClient = useQueryClient();

  // 백그라운드 프리패치 — 앱 로드 1.5초 후 모든 탭 데이터를 미리 수신
  useEffect(() => {
    const timer = setTimeout(() => {
      // 시장 탭
      queryClient.prefetchQuery({ queryKey: Q.kospi(),       queryFn: fetchers.kospi       });
      queryClient.prefetchQuery({ queryKey: Q.krScore(),     queryFn: fetchers.krScore     });
      queryClient.prefetchQuery({ queryKey: Q.sectors(),     queryFn: fetchers.sectors     });
      queryClient.prefetchQuery({ queryKey: Q.usIndices(),   queryFn: fetchers.usIndices   });
      queryClient.prefetchQuery({ queryKey: Q.score(),       queryFn: fetchers.score       });
      queryClient.prefetchQuery({ queryKey: Q.fgi(),         queryFn: fetchers.fgi         });
      queryClient.prefetchQuery({ queryKey: Q.usSectors(),   queryFn: fetchers.usSectors   });
      // 시장 > 테마 탭 (첫 번째 테마)
      const t0 = THEMES[0];
      if (t0.kr_stocks.length)     queryClient.prefetchQuery({ queryKey: Q.themeKr(t0.id), queryFn: () => fetchers.themeKr(t0.kr_stocks.map((s) => s.ticker).join(",")) });
      if (t0.us_candidates.length) queryClient.prefetchQuery({ queryKey: Q.themeUs(t0.id), queryFn: () => fetchers.themeUs(t0.us_candidates.map((s) => s.ticker).join(","), 10) });
      // 차트 탭
      queryClient.prefetchQuery({ queryKey: Q.investorTrends(), queryFn: fetchers.investorTrends });
      queryClient.prefetchQuery({ queryKey: Q.commodities(), queryFn: fetchers.commodities });
      queryClient.prefetchQuery({ queryKey: Q.forex(),       queryFn: fetchers.forex       });
      queryClient.prefetchQuery({ queryKey: Q.ranking("domestic", "amount"), queryFn: () => fetchers.ranking("domestic", "amount") });
      queryClient.prefetchQuery({ queryKey: Q.etf("kr", "popular"),          queryFn: () => fetchers.etf("kr", "popular")          });
      // 관심 탭
      if (Object.keys(_WL_PARAMS).length > 0) {
        queryClient.prefetchQuery({ queryKey: Q.watchlist(_KR_TICKERS.join(","), _US_TICKERS.join(",")), queryFn: () => fetchers.watchlist(_WL_PARAMS) });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>

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
            <button
              onClick={() => setShowSearch(true)}
              className="mt-3 w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                         bg-gray-800/60 hover:bg-gray-700/60 transition-colors text-gray-500 hover:text-gray-300"
            >
              <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">종목 검색</span>
            </button>
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
            <div className="pt-1 mt-1 border-t border-gray-800/40">
              <button
                onClick={() => setShowHelp(true)}
                className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                           transition-all duration-150
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
                           text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
              >
                <BookOpenIcon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">도움말</span>
              </button>
            </div>
          </nav>

          {/* 하단 버전 */}
          <div className="px-4 py-3 border-t border-gray-800/60">
            <span className="text-[11px] text-gray-700">v1.0</span>
          </div>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 xl:p-10">
            <div className="max-w-3xl mx-auto">
              <SectionContent activeTab={activeTab} />
            </div>
          </div>
        </main>
      </div>

      {/* ════════ 모바일: 하단 탭바 레이아웃 ════════ */}
      <div className="lg:hidden">
        {/* 모바일 헤더 */}
        <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-gray-800/60 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="w-16" />
            <div className="flex items-center gap-1.5">
              <ChartBarIcon className="w-3.5 h-3.5 text-blue-400" />
              <h1 className="text-sm font-semibold text-white tracking-tight">stock-pro</h1>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHelp(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
                aria-label="도움말"
              >
                <QuestionMarkCircleIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
                aria-label="종목 검색"
              >
                <MagnifyingGlassIcon className="w-4 h-4" />
              </button>
            </div>
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
