import {
  Bone,
  CardListSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
  SkeletonRegion,
  TableSkeleton,
} from "@/components/ui/SkeletonLoaders"

/**
 * Teacher portal route skeleton.
 *
 * Teacher routes are roster- and submission-heavy, so the placeholder leads
 * with a table rather than a calendar — matching attendance, grading and the
 * exam list, the three most-visited destinations in this segment.
 */
export default function TeacherLoading() {
  return (
    <SkeletonRegion label="Loading your teacher portal">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeaderSkeleton />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton count={4} />
        </div>

        {/* Filter pills above the roster */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Bone key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TableSkeleton rows={6} columns={5} caption="Loading roster" />
          </div>

          <div className="space-y-3">
            <Bone className="h-3 w-36 rounded-md" />
            <CardListSkeleton count={3} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  )
}
