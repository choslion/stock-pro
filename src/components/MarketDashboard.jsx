import { useState } from "react";
import GetVixFgiScore from "./GetVixFgiScore";
import GetFgi from "./GetFgi";
import Vix from "./Vix";
import GetRangeVix from "./GetRangeVix";
import GetSp500 from "./GetSp500";
import GetKospi from "./GetKospi";
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

      {tab === "kr" && (
        <div className="space-y-6">
          <GetKospi />
          <Card title="업종별 동향" subtitle="KOSPI 업종 등락률" icon={ChartBarIcon}>
            <TrendingSectors />
          </Card>
        </div>
      )}

      {tab === "us" && (
        <div className="space-y-6">
          <GetVixFgiScore />
          <GetFgi />
          <Vix />
          <GetRangeVix />
          <GetSp500 />
        </div>
      )}
    </div>
  );
}
