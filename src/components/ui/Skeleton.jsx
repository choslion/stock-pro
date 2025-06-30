export default function Skeleton() {
  return (
    <div class="bg-gray-800 p-6 rounded-2xl shadow-md">
      <div class="flex animate-pulse space-x-4">
        <div class="flex-1 space-y-5 py-1">
          <div class="space-y-4">
            <div class="grid grid-cols-4 gap-4">
              <div class="col-span-2 h-4 rounded bg-gray-200"></div>
            </div>
            <div class="grid grid-cols-4 gap-4">
              <div class="col-span-3 h-2 rounded bg-gray-200"></div>
              <div class="col-span-1 h-2 rounded bg-gray-200"></div>
            </div>
            <div class="grid grid-cols-4 gap-4">
              <div class="col-span-1 h-2 rounded bg-gray-200"></div>
              <div class="col-span-3 h-2 rounded bg-gray-200"></div>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2 h-2 rounded bg-gray-200"></div>
              <div class="col-span-1 h-2 rounded bg-gray-200"></div>
            </div>
            <div class="h-3 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
