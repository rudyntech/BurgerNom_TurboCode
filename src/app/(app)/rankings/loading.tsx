import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function RankingsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-4 h-12 w-full rounded-full" />
      <div className="mt-4">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}
