import { useState } from "react";
import Card from "./ui/Card";
import StockRanking from "./StockRanking";
import InvestorTrends from "./InvestorTrends";
import Commodities from "./Commodities";
import Forex from "./Forex";

const TABS = [
  { id: "ranking",     label: "실시간 차트" },
  { id: "investor",   label: "투자자 동향" },
  { id: "commodities", label: "원자재" },
  { id: "forex",       label: "환율" },
];

export default function MarketTrends() {
  const [activeTab, setActiveTab] = useState("ranking");

  return (
    <Card>
      <div className="flex gap-1 border-b border-gray-700 mb-4 -mt-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-white border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ranking"     && <StockRanking />}
      {activeTab === "investor"   && <InvestorTrends />}
      {activeTab === "commodities" && <Commodities />}
      {activeTab === "forex"       && <Forex />}
    </Card>
  );
}
