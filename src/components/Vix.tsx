import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import SummaryBanner from "./ui/SummaryBanner";
import type { BannerType } from "./ui/SummaryBanner";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { AlertTriangleIcon } from "./ui/Icons";

interface VixMeta {
  label:  string;
  color:  string;
  banner: { text: string; type: BannerType };
}

function getVixMeta(value: number): VixMeta {
  if (value < 15) return {
    label: "낮은 변동성 (안정)", color: "text-green-400",
    banner: { text: "시장은 안정적입니다 — 투자하기 좋은 환경입니다", type: "safe" },
  };
  if (value < 25) return {
    label: "보통 변동성", color: "text-yellow-300",
    banner: { text: "보통 수준의 변동성입니다 — 신중하게 접근하세요", type: "caution" },
  };
  if (value < 35) return {
    label: "높은 변동성 (주의)", color: "text-orange-400",
    banner: { text: "시장 불안감이 높습니다 — 분할 매수를 고려하세요", type: "warning" },
  };
  return {
    label: "극단적 변동성 (위험)", color: "text-red-400",
    banner: { text: "시장이 매우 불안정합니다 — 현금 비중을 높이세요", type: "danger" },
  };
}

export default function Vix() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.vix(),
    queryFn:  fetchers.vix,
  });

  const meta = data ? getVixMeta(parseFloat(data.value)) : null;

  return (
    <Card title="시장 불안 지수" subtitle="CBOE Volatility Index (VIX)" icon={AlertTriangleIcon}>
      <div className="min-h-[200px] flex flex-col justify-center">
        {error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : isLoading ? (
          <Spin />
        ) : data && meta ? (
          <>
            <p className="text-sm text-gray-400">측정 날짜: {data.date}</p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-base">현재 지수:</span>
              <span className={`text-2xl font-bold ${meta.color}`}>
                {parseFloat(data.value).toFixed(2)}
              </span>
            </div>
            <p className={`text-sm mt-2 ${meta.color}`}>● {meta.label}</p>
            <SummaryBanner text={meta.banner.text} type={meta.banner.type} />
          </>
        ) : null}
      </div>
    </Card>
  );
}
