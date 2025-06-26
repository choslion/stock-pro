// components/ui/Card.jsx
export default function Card({ title, children }) {
  return (
    <div className="bg-gray-800 p-5 rounded-2xl shadow-md space-y-3">
      {title && (
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
