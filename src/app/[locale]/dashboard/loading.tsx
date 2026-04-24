/**
 * Dashboard loading skeleton — shown by Next.js App Router while server
 * components fetch data. Prevents blank-page flash on slow connections (3G).
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-xl bg-white/[0.06]" />
        <div className="h-4 w-48 rounded-lg bg-white/[0.04]" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
              <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
            </div>
            <div className="space-y-1.5">
              <div className="h-8 w-24 rounded-lg bg-white/[0.06]" />
              <div className="h-3 w-32 rounded-full bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="h-4 w-48 rounded-full bg-white/[0.06]" />
            <div className="h-3 w-20 rounded-full bg-white/[0.04]" />
          </div>
          <div className="flex items-end gap-2 h-28">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-white/[0.06]"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
                <div className="h-2 w-6 rounded-full bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <div className="h-4 w-28 rounded-full bg-white/[0.06]" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded-full bg-white/[0.06]" />
                <div className="h-3 w-12 rounded-full bg-white/[0.04]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg h-12 bg-white/[0.04]" />
                <div className="rounded-lg h-12 bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06]" />
              <div className="h-4 w-32 rounded-full bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="rounded-xl h-16 bg-white/[0.04]" />
              ))}
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
