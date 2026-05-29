import { useState, Suspense, lazy } from "react";
import GetUsIndices from "./GetUsIndices";
import GetVixFgiScore from "./GetVixFgiScore";
import GetRangeVix from "./GetRangeVix";
import TrendingUsSectors from "./TrendingUsSectors";
import GetKospi from "./GetKospi";
import GetKrScore from "./GetKrScore";
import TrendingSectors from "./TrendingSectors";
import AiBriefing from "./AiBriefing";
import Card from "./ui/Card";
import { ChartBarIcon } from "./ui/Icons";
const ThemeSectors = lazy(() => import("./ThemeSectors"));

type Tab = "kr" | "us" | "theme";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "kr",    label: "국내" },
  { id: "us",    label: "해외" },
  { id: "theme", label: "테마" },
];

export default function MarketDashboard() {
  const [tab, setTab] = useState<Tab>("kr");

  return (
    <div>
      <AiBriefing />
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

      {tab === "kr" && (
        <div className="space-y-6">
          <GetKospi />
          <GetKrScore />
          <Card title="업종별 동향" subtitle="KOSPI 업종 등락률" icon={ChartBarIcon}>
            <TrendingSectors />
          </Card>
        </div>
      )}
      {tab === "us" && (
        <div className="space-y-6">
          <GetUsIndices />
          <GetVixFgiScore />
          <Card title="업종별 동향" subtitle="S&P 500 섹터 ETF 등락률" icon={ChartBarIcon}>
            <TrendingUsSectors />
          </Card>
          <GetRangeVix />
        </div>
      )}
      {tab === "theme" && (
        <Suspense fallback={null}>
          <ThemeSectors />
        </Suspense>
      )}
    </div>
  );
}
