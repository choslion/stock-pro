const scoreData = [
  {
    range: "0~20",
    label: "극단적 공포",
    action: "✅ 매수 기회",
    explanation: "시장 과매도",
    color: "text-green-400",
  },
  {
    range: "21~40",
    label: "공포",
    action: "🟡 관망/분할 매수",
    explanation: "일부 진입 고려",
    color: "text-yellow-300",
  },
  {
    range: "41~60",
    label: "중립",
    action: "⚪ 보유/관망",
    explanation: "불확실한 구간",
    color: "text-white",
  },
  {
    range: "61~80",
    label: "탐욕",
    action: "🔸 수익 실현",
    explanation: "과도한 상승",
    color: "text-orange-300",
  },
  {
    range: "81~100",
    label: "극단적 탐욕",
    action: "❌ 매도 고려",
    explanation: "시장 과열 주의",
    color: "text-red-400",
  },
];

export default function ScoreTooltipContent() {
  return (
    <div className="text-left text-xs text-gray-100 w-[320px] sm:w-[440px] md:w-[480px] max-w-[90vw] overflow-x-auto">
      <div className="font-semibold text-sm text-blue-200 mb-2 flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          className="w-4 h-4 text-blue-300"
        >
          <path
            fillRule="evenodd"
            d="M12 2a10 10 0 100 20 10 10 0 000-20zM11 10a1 1 0 012 0v6a1 1 0 11-2 0v-6zm1-4.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z"
            clipRule="evenodd"
          />
        </svg>
        점수 의미
      </div>
      <table className="w-full table-fixed border-separate border-spacing-y-1 text-[11px] sm:text-xs">
        <thead className="text-gray-400">
          <tr>
            <th className="text-left w-[15%]">구간</th>
            <th className="text-left w-[21%]">의미</th>
            <th className="text-left w-[34%]">투자 판단</th>
            <th className="text-left w-[30%]">설명</th>
          </tr>
        </thead>
        <tbody>
          {scoreData.map((row, idx) => (
            <tr key={idx} className="align-top">
              <td className="font-semibold whitespace-nowrap">{row.range}</td>
              <td className="whitespace-nowrap">{row.label}</td>
              <td className={`${row.color} whitespace-nowrap`}>{row.action}</td>
              <td className="whitespace-nowrap">{row.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
