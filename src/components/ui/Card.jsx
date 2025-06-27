import Tooltip from "./Tooltip"; // 툴팁 컴포넌트 불러오기

export default function Card({ title, titleTooltip, children }) {
  const isRenderable =
    typeof children === "string" ||
    typeof children === "number" ||
    Array.isArray(children) ||
    (children && typeof children.type === "function") ||
    (children && typeof children === "object" && "props" in children);

  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-md space-y-3">
      {title && (
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          {title}
          {titleTooltip && <Tooltip content={titleTooltip} />}
        </h3>
      )}
      {isRenderable ? (
        children
      ) : (
        <p className="text-sm text-red-400">
          🚨 Card 내부 children이 유효한 React 요소가 아닙니다.
        </p>
      )}
    </div>
  );
}
