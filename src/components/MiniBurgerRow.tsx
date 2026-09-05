import Link from "next/link";
import type { RestaurantWithUserData } from "@/types/database";
import { RatingBadge } from "@/components/ui/RatingBadge";

export function MiniBurgerRow({
  restaurant,
  showUserRating = false,
}: {
  restaurant: RestaurantWithUserData;
  showUserRating?: boolean;
}) {
  const value = showUserRating ? restaurant.entry?.overall_rating ?? null : restaurant.ranking?.avg_rating ?? null;
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-black/[0.03]"
    >
      <span className="text-xl" aria-hidden="true">
        🍔
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-char">{restaurant.display_name}</span>
      <RatingBadge value={value} tone={showUserRating ? "mustard" : "neutral"} size="sm" />
    </Link>
  );
}
