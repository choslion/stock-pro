export default function Card({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-md transition duration-200 hover:shadow-xl hover:ring-1 hover:ring-blue-400/50">
      {title && (
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            {Icon && <Icon className="w-4 h-4 text-blue-400 shrink-0" />}
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
