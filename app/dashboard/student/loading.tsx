import {
  CalendarSkeleton,
  CardListSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
  SkeletonRegion,
} from "@/components/ui/SkeletonLoaders"

/**
 * Student portal route skeleton.
 *
 * Rendered inside the already-mounted student layout, so the sidebar, search
 * bar and notification bell stay live — only the content column shimmers.
 * The shape (stats row, calendar, upcoming rail) is the student overview,
 * which is what the majority of navigations into this segment land on.
 */
export default function StudentLoading() {
  return (
    <SkeletonRegion label="Loading your student portal">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeaderSkeleton withAction={false} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton count={4} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CalendarSkeleton />
          </div>

          <div className="space-y-3">
            <CardListSkeleton count={4} height="h-24" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  )
}
