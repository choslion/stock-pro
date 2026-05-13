const STYLES = {
  safe:    "bg-green-900/40 text-green-300 border border-green-700/50",
  caution: "bg-yellow-900/40 text-yellow-300 border border-yellow-700/50",
  warning: "bg-orange-900/40 text-orange-300 border border-orange-700/50",
  danger:  "bg-red-900/40 text-red-300 border border-red-700/50",
  neutral: "bg-gray-700/40 text-gray-300 border border-gray-600/50",
};

export default function SummaryBanner({ text, type = "neutral" }) {
  return (
    <div className={`mt-4 px-3 py-2.5 rounded-lg text-sm text-center font-medium ${STYLES[type]}`}>
      {text}
    </div>
  );
}
