export default function Skeleton() {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl shadow-md">
      <div className="flex animate-pulse space-x-4">
        <div className="flex-1 space-y-5 py-1">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2 h-4 rounded bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 h-2 rounded bg-gray-200"></div>
              <div className="col-span-1 h-2 rounded bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 h-2 rounded bg-gray-200"></div>
              <div className="col-span-3 h-2 rounded bg-gray-200"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-2 rounded bg-gray-200"></div>
              <div className="col-span-1 h-2 rounded bg-gray-200"></div>
            </div>
            <div className="h-3 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
