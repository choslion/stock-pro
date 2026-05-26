import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { TrendingUpIcon } from "./ui/Icons";

function IndexBlock({ label, data }) {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-600 text-sm">
        {label} 데이터 없음
      </div>
    );
  }
  const isPositive = data.change_pct >= 0;
  const color = isPositive ? "text-red-400" : "text-blue-400";

  return (
    <div className="flex flex-col items-center py-5">
      <p className="text-xs font-semibold text-gray-500 tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-white tabular-nums">
        {data.value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className={`text-sm font-semibold mt-1.5 tabular-nums ${color}`}>
        {isPositive ? "+" : ""}{data.change.toFixed(2)}
        <span className="text-xs ml-1 opacity-80">
          ({isPositive ? "+" : ""}{data.change_pct.toFixed(2)}%)
        </span>
      </p>
      <p className="text-[11px] text-gray-600 mt-1">{data.date}</p>
    </div>
  );
}

export default function GetKospi() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.kospi(),
    queryFn:  fetchers.kospi,
  });

  return (
    <Card title="국내 증시" subtitle="KOSPI · KOSDAQ 지수" icon={TrendingUpIcon}>
      <div className="min-h-[120px] flex flex-col justify-center">
        {error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : isLoading ? (
          <Spin />
        ) : (
          <div className="grid grid-cols-2 divide-x divide-gray-700">
            <IndexBlock label="코스피" data={data.kospi} />
            <IndexBlock label="코스닥" data={data.kosdaq} />
          </div>
        )}
      </div>
    </Card>
  );
}
