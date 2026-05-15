const STYLES = {
  safe:    "bg-green-900/30 text-green-300 border border-green-800/50 border-l-2 border-l-green-400",
  caution: "bg-yellow-900/30 text-yellow-300 border border-yellow-800/50 border-l-2 border-l-yellow-400",
  warning: "bg-orange-900/30 text-orange-300 border border-orange-800/50 border-l-2 border-l-orange-400",
  danger:  "bg-red-900/30 text-red-300 border border-red-800/50 border-l-2 border-l-red-400",
  neutral: "bg-gray-700/30 text-gray-300 border border-gray-600/50 border-l-2 border-l-gray-400",
};

export default function SummaryBanner({ text, type = "neutral" }) {
  return (
    <div className={`mt-4 px-3.5 py-2.5 rounded-lg text-sm font-medium ${STYLES[type]}`}>
      {text}
    </div>
  );
}
