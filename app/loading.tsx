import { Bone, DashboardSkeleton } from "@/components/ui/SkeletonLoaders"

/**
 * Phase 7 — root loading UI.
 *
 * Shown for any route that has no nearer `loading.tsx`. Because most of the
 * app lives behind a sidebar shell, this reproduces that shell rather than
 * flashing a bare spinner: the frame appears instantly and only the content
 * shimmers, which reads as "almost there" instead of "nothing happened yet".
 */
export default function RootLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar — rendered solid, not shimmering, so the brand lands immediately. */}
      <aside className="relative z-10 flex w-[240px] shrink-0 flex-col bg-slate-900 py-6">
        <div className="mb-8 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
              <span className="text-sm font-bold text-white">⚡</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">EduConnect</span>
          </div>
        </div>

        <div className="px-5 pb-4">
          <Bone dark className="h-2 w-24 rounded-md" />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Bone dark className="h-5 w-5 shrink-0 rounded-md" />
              <Bone dark className="h-3 rounded-md" />
            </div>
          ))}
        </nav>
      </aside>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <Bone className="h-9 w-full max-w-md rounded-lg" />
          <div className="ml-4 flex items-center gap-6">
            <Bone className="h-8 w-8 rounded-lg" />
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="space-y-1.5 text-right">
                <Bone className="h-3 w-24 rounded-md" />
                <Bone className="ml-auto h-2 w-16 rounded-md" />
              </div>
              <Bone className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-slate-50 p-8">
          <DashboardSkeleton />
        </div>
      </main>
    </div>
  )
}
