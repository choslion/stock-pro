import Tooltip from "./Tooltip"; // 툴팁 컴포넌트 불러오기

export default function Card({ title, titleTooltip, children }) {
  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-md transition duration-200 hover:shadow-xl hover:ring-1 hover:ring-blue-400">
      {title && (
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          {title}
          {titleTooltip && <Tooltip content={titleTooltip} />}
        </h3>
      )}
      {children}
    </div>
  );
}
