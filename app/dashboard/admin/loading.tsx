import {
  Bone,
  PageHeaderSkeleton,
  StatCardSkeleton,
  SkeletonRegion,
  TableSkeleton,
} from "@/components/ui/SkeletonLoaders"

/**
 * Admin portal route skeleton.
 *
 * Six KPI tiles rather than four, plus a chart block — the platform analytics
 * overview is the segment root and by far the heaviest query in the app, so
 * this is the skeleton users see longest.
 */
export default function AdminLoading() {
  return (
    <SkeletonRegion label="Loading the admin console">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeaderSkeleton />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCardSkeleton count={6} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Revenue chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <div className="space-y-2">
                <Bone className="h-4 w-40 rounded-md" />
                <Bone className="h-2.5 w-56 rounded-md" />
              </div>
              <Bone className="h-8 w-28 rounded-lg" />
            </div>

            {/* Bars of varying height read as a chart, not a grey slab. */}
            <div className="flex h-56 items-end gap-3">
              {[45, 70, 38, 82, 60, 91, 54, 76, 43, 68, 88, 57].map((height, i) => (
                <div key={i} className="flex-1" style={{ height: `${height}%` }}>
                  <Bone className="h-full w-full rounded-t-md" />
                </div>
              ))}
            </div>
          </div>

          {/* Approvals queue rail */}
          <div className="space-y-3">
            <Bone className="h-3 w-40 rounded-md" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <Bone className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-3 w-32 rounded-md" />
                    <Bone className="h-2.5 w-44 rounded-md" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Bone className="h-8 flex-1 rounded-lg" />
                  <Bone className="h-8 flex-1 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <TableSkeleton rows={5} columns={6} caption="Loading user directory" />
      </div>
    </SkeletonRegion>
  )
}
