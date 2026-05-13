export default function Card({ title, subtitle, children }) {
  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-md transition duration-200 hover:shadow-xl hover:ring-1 hover:ring-blue-400">
      {title && (
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
