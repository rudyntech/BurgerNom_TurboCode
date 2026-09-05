import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-4 h-32 w-full" />
      <div className="mt-8">
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}
