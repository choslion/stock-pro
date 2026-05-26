import { useQuery } from "@tanstack/react-query";
import { Q, fetchers } from "../lib/queries";
import Card from "./ui/Card";
import Spin from "./ui/Spin";
import ErrorBlock from "./ui/ErrorBlock";
import parseError from "../lib/parseError";
import { TrendingUpIcon } from "./ui/Icons";

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric", month: "short", day: "numeric",
  });

export default function GetSp500() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: Q.sp500(),
    queryFn:  fetchers.sp500,
  });

  const isPositive    = data ? data.deviation_percent >= 0 : false;
  const deviationColor = isPositive ? "text-green-400" : "text-red-400";

  return (
    <Card title="미국 증시 현황" subtitle="S&P 500 지수" icon={TrendingUpIcon}>
      <div className="min-h-[200px] flex flex-col justify-center">
        {error && !data ? (
          <ErrorBlock message={parseError(error)} onRetry={refetch} />
        ) : isLoading ? (
          <Spin />
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">업데이트 날짜: {formatDate(data.date)}</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>현재 지수</span>
                <span className="font-semibold text-blue-300">{data.current_value.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p>200일 이동평균</p>
                  <p className="text-xs text-gray-500">최근 200거래일 평균 가격</p>
                </div>
                <span className="font-semibold text-yellow-300">{data.ma200.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p>평균 대비 차이</p>
                  <p className="text-xs text-gray-500">
                    {isPositive ? "평균보다 고평가 구간" : "평균보다 저평가 구간"}
                  </p>
                </div>
                <span className={`font-semibold ${deviationColor}`}>
                  {isPositive ? "+" : ""}{data.deviation_percent.toFixed(2)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
