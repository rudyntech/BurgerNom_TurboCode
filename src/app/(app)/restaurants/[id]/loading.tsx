import { Skeleton } from "@/components/ui/Skeleton";

export default function RestaurantDetailLoading() {
  return (
    <div>
      <Skeleton className="h-6 w-24" />
      <Skeleton className="mt-2 h-8 w-2/3" />
      <Skeleton className="mt-4 h-40 w-full" />
      <Skeleton className="mt-4 h-96 w-full" />
    </div>
  );
}
