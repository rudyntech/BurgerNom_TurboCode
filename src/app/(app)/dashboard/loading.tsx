import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-56 w-full rounded-3xl" />
      <div className="mt-8">
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}
