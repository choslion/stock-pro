export default function ErrorBlock({ message, onRetry }) {
  const isTimeout = message?.includes("절전") || message?.includes("60초");
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
      <span className="text-2xl">{isTimeout ? "⏱️" : "❌"}</span>
      <p className="text-sm text-red-400 max-w-xs leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 px-4 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
