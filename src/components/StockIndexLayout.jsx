import Vix from "./Vix";
import GetRangeVix from "./GetRangeVix";
import GetSp500 from "./GetSp500";
import GetFgi from "./GetFgi";
import GetVixFgiScore from "./GetVixFgiScore";

export default function StockIndexDashboard() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 md:p-10">
      <div className="max-w-screen-md mx-auto w-full">
        <h1 className="text-3xl sm:text-3xl font-bold my-8 text-center">
          📊 주식 상황 확인
        </h1>

        {/* 카드 1~2개씩 배치 - 반응형 */}
        <div className="space-y-6">
          <div className="col-span-1 w-full">
            <GetVixFgiScore />
          </div>
          <div className="col-span-1 w-full">
            <GetFgi />
          </div>
          <div className="col-span-1 w-full">
            <Vix />
          </div>
          <div className="col-span-1 w-full">
            <GetRangeVix />
          </div>
          <div className="col-span-1 w-full">
            <GetSp500 />
          </div>
        </div>
      </div>
    </div>
  );
}
