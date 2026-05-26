import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import SummaryBanner from "./ui/SummaryBanner";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { ActivityIcon } from "./ui/Icons";

const formatDate = (isoDateStr) =>
  new Date(isoDateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
  });

const LABEL_MAP = {
  "extreme fear": { ko: "극단적 공포", color: "text-red-400" },
  "fear":         { ko: "공포",       color: "text-orange-400" },
  "neutral":      { ko: "중립",       color: "text-yellow-300" },
  "greed":        { ko: "탐욕",       color: "text-green-400" },
  "extreme greed":{ ko: "극단적 탐욕", color: "text-green-300" },
};
const BANNER_MAP = {
  "extreme fear":  { text: "지금은 매수 기회입니다 — 시장이 과도하게 하락한 상태", type: "safe" },
  "fear":          { text: "분할 매수를 고려해 보세요",                           type: "caution" },
  "neutral":       { text: "시장은 중립 상태입니다 — 관망을 추천합니다",           type: "neutral" },
  "greed":         { text: "수익 실현을 고려해 보세요 — 가격이 많이 오른 상태",    type: "warning" },
  "extreme greed": { text: "지금은 팔 때입니다 — 시장이 과열되어 있습니다",        type: "danger" },
};

export default function GetFgi() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.fgi(),
    queryFn:  fetchers.fgi,
  });

  const desc   = data?.description?.toLowerCase() ?? "";
  const label  = LABEL_MAP[desc] ?? { ko: data?.description ?? "", color: "text-yellow-300" };
  const banner = BANNER_MAP[desc] ?? { text: "관망을 추천합니다", type: "neutral" };

  return (
    <Card title="시장 심리 지수" subtitle="CNN Fear & Greed Index" icon={ActivityIcon}>
      <div className="min-h-[220px] flex flex-col justify-center">
        {error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : isLoading ? (
          <Spin />
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-2">업데이트 날짜: {formatDate(data.last_update)}</p>
            <div className="flex justify-between items-center mb-3">
              <span className="text-base">현재 상태:</span>
              <span className={`text-lg font-bold ${label.color}`}>{label.ko}</span>
            </div>
            <div className="text-3xl font-extrabold text-center text-blue-300">
              {data.value.toFixed(2)}
              <span className="text-base font-normal text-gray-400 ml-1">/ 100</span>
            </div>
            <SummaryBanner text={banner.text} type={banner.type} />
          </>
        )}
      </div>
    </Card>
  );
}
