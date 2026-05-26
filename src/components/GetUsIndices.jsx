import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { TrendingUpIcon } from "./ui/Icons";

function colorClass(changePct) {
  return changePct >= 0 ? "text-red-400" : "text-blue-400";
}

/* ── 모바일: 가로 한 줄 (라벨 좌 | 값 우) ── */
function IndexRow({ label, data }) {
  if (!data) return null;
  const color = colorClass(data.change_pct);
  const sign  = data.change_pct >= 0 ? "+" : "";
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <div>
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="text-[11px] text-gray-600 mt-0.5">{data.date}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold tabular-nums text-white">
          {data.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className={`text-sm font-semibold tabular-nums ${color}`}>
          {sign}{data.change.toFixed(2)}
          <span className="text-xs ml-1 opacity-80">({sign}{data.change_pct.toFixed(2)}%)</span>
        </p>
      </div>
    </div>
  );
}

/* ── 데스크탑: 세로 카드 (라벨 위 | 값 아래) ── */
function IndexBlock({ label, data, border }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-600 text-sm">
        {label} 데이터 없음
      </div>
    );
  }
  const color = colorClass(data.change_pct);
  const sign  = data.change_pct >= 0 ? "+" : "";
  return (
    <div className={`flex flex-col items-center py-5 ${border ? "border-x border-gray-700" : ""}`}>
      <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">
        {data.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className={`text-sm font-semibold mt-1.5 tabular-nums ${color}`}>
        {sign}{data.change.toFixed(2)}
        <span className="text-xs ml-1 opacity-80">({sign}{data.change_pct.toFixed(2)}%)</span>
      </p>
      <p className="text-[11px] text-gray-600 mt-1">{data.date}</p>
    </div>
  );
}

export default function GetUsIndices() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.usIndices(),
    queryFn:  fetchers.usIndices,
  });

  return (
    <Card title="미국 증시" subtitle="S&P 500 · NASDAQ · DOW" icon={TrendingUpIcon}>
      <div className="min-h-[120px] flex flex-col justify-center">
        {error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : isLoading ? (
          <div className="flex justify-center py-6"><Spin /></div>
        ) : (
          <>
            {/* 모바일: 세로 리스트 */}
            <div className="flex flex-col divide-y divide-gray-700/60 sm:hidden">
              <IndexRow label="S&P 500" data={data.sp500} />
              <IndexRow label="NASDAQ"  data={data.nasdaq} />
              <IndexRow label="DOW"     data={data.dow} />
            </div>
            {/* sm 이상: 3컬럼 그리드 */}
            <div className="hidden sm:grid grid-cols-3">
              <IndexBlock label="S&P 500" data={data.sp500} />
              <IndexBlock label="NASDAQ"  data={data.nasdaq} border />
              <IndexBlock label="DOW"     data={data.dow} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
