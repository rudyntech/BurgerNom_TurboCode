import Link from "next/link";
import type { RestaurantWithUserData } from "@/types/database";
import { StatusPill } from "@/components/ui/StatusPill";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { quickSetRestaurantStatus } from "@/lib/actions/restaurantEntry";
import { Heart, CheckCircle2 } from "lucide-react";

export function BurgerCard({ restaurant }: { restaurant: RestaurantWithUserData }) {
  const status = restaurant.entry?.status ?? "untried";
  const rank = restaurant.ranking?.rank ?? null;
  const mbcScore = restaurant.ranking?.avg_rating ?? null;
  const myScore = restaurant.entry?.overall_rating ?? null;

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      <Link href={`/restaurants/${restaurant.id}`} className="flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bun text-2xl">
          🍔
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {rank !== null && (
              <span className="shrink-0 rounded-md bg-flame-50 px-1.5 py-0.5 text-xs font-bold text-flame-600">
                #{rank}
              </span>
            )}
            <p className="truncate font-display text-base font-semibold text-char">{restaurant.display_name}</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <StatusPill status={status} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <RatingBadge value={mbcScore} tone="flame" size="sm" />
          {myScore !== null && (
            <span className="text-[11px] font-semibold text-char/50">You: {myScore.toFixed(1)}</span>
          )}
        </div>
      </Link>
      {status !== "tried" && (
        <div className="flex gap-2 border-t border-black/5 px-4 py-2">
          {status !== "want_to_try" && (
            <form action={quickSetRestaurantStatus.bind(null, restaurant.id, "want_to_try")}>
              <button className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-mustard-500 hover:bg-mustard-400/10">
                <Heart size={13} /> Want to Try
              </button>
            </form>
          )}
          <form action={quickSetRestaurantStatus.bind(null, restaurant.id, "tried")}>
            <button className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-lettuce-600 hover:bg-lettuce-500/10">
              <CheckCircle2 size={13} /> Mark Tried
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
