export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 animate-pulse">
      {/* Hero skeleton */}
      <div className="min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-blue-50 dark:from-blue-950/20 via-white dark:via-gray-950 to-purple-50 dark:to-purple-950/20 py-20">
        <div className="text-center space-y-6 w-full max-w-2xl mx-auto px-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-32 mx-auto mb-6" />
          <div className="h-16 md:h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl w-4/5 mx-auto" />
          <div className="h-16 md:h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl w-3/4 mx-auto" />
          <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded-xl w-1/2 mx-auto mt-2" />
          <div className="space-y-2 mt-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/3 mx-auto" />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2 mx-auto" />
          </div>
          <div className="flex gap-4 justify-center mt-8">
            <div className="h-12 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            <div className="h-12 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Projects skeleton */}
      <div className="py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-28 mx-auto" />
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-64 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
            >
              <div className="h-52 bg-gray-200 dark:bg-gray-800" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-5/6" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-lg w-2/3" />
                <div className="flex gap-2 mt-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded-md"
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills skeleton */}
      <div className="py-20 px-4 max-w-6xl mx-auto bg-gray-50 dark:bg-gray-900/50 rounded-3xl">
        <div className="text-center mb-12 space-y-3">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-56 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-80 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
            >
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl mb-5" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2 py-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
