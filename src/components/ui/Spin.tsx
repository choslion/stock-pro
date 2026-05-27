export default function Spin() {
  return (
    <div className="flex items-center gap-2 text-sm text-sky-300 font-medium">
      <svg
        className="animate-spin h-4 w-4 text-sky-400"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="relative">
        데이터를 불러오는 중
        <span className="dot-flash absolute -right-6 top-0">
          <span className="dot">.</span>
          <span className="dot delay-100">.</span>
          <span className="dot delay-200">.</span>
        </span>
      </span>
    </div>
  );
}
