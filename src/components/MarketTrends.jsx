import { useState } from "react";
import Card from "./ui/Card";
import ScrollTabs from "./ui/ScrollTabs";
import StockRanking from "./StockRanking";
import InvestorTrends from "./InvestorTrends";
import Commodities from "./Commodities";
import Forex from "./Forex";
import EtfList from "./EtfList";

const TABS = [
  { id: "ranking",     label: "실시간 차트" },
  { id: "investor",    label: "투자자 동향" },
  { id: "etf",         label: "ETF" },
  { id: "commodities", label: "원자재" },
  { id: "forex",       label: "환율" },
];

export default function MarketTrends() {
  const [activeTab, setActiveTab] = useState("ranking");

  return (
    <Card>
      <div className="mb-4 -mt-1">
        <ScrollTabs
          tabs={TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="차트 탭"
        />
      </div>

      {activeTab === "ranking"     && <StockRanking />}
      {activeTab === "investor"    && <InvestorTrends />}
      {activeTab === "etf"         && <EtfList />}
      {activeTab === "commodities" && <Commodities />}
      {activeTab === "forex"       && <Forex />}
    </Card>
  );
}
