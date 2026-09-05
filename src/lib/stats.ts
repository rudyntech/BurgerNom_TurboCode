import type { RestaurantWithUserData } from "@/types/database";

export interface CompletionStats {
  triedCount: number;
  total: number;
  percent: number;
}

export function computeCompletionStats(restaurants: RestaurantWithUserData[]): CompletionStats {
  const total = restaurants.length;
  const triedCount = restaurants.filter((r) => r.entry?.status === "tried").length;
  return { triedCount, total, percent: total > 0 ? Math.round((triedCount / total) * 100) : 0 };
}

export function computeAveragePersonalRating(restaurants: RestaurantWithUserData[]): number | null {
  const ratings = restaurants
    .filter((r) => r.entry?.status === "tried")
    .map((r) => r.entry?.overall_rating)
    .filter((v): v is number => v !== null && v !== undefined);
  if (ratings.length === 0) return null;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

export function topRatedByUser(
  restaurants: RestaurantWithUserData[],
  limit: number,
  direction: "highest" | "lowest" = "highest",
): RestaurantWithUserData[] {
  const rated = restaurants.filter(
    (r) => r.entry?.status === "tried" && r.entry.overall_rating !== null,
  );
  const sorted = [...rated].sort((a, b) => {
    const diff = (a.entry?.overall_rating ?? 0) - (b.entry?.overall_rating ?? 0);
    return direction === "highest" ? -diff : diff;
  });
  return sorted.slice(0, limit);
}

export function wantToTryList(restaurants: RestaurantWithUserData[]): RestaurantWithUserData[] {
  return restaurants
    .filter((r) => r.entry?.status === "want_to_try")
    .sort((a, b) => (a.ranking?.rank ?? Infinity) - (b.ranking?.rank ?? Infinity));
}

export function recentlyTried(restaurants: RestaurantWithUserData[], limit: number): RestaurantWithUserData[] {
  return [...restaurants]
    .filter((r) => r.entry?.status === "tried")
    .sort((a, b) => {
      const aDate = a.entry?.date_tried ?? a.entry?.updated_at ?? "";
      const bDate = b.entry?.date_tried ?? b.entry?.updated_at ?? "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, limit);
}

export function recentReviews(restaurants: RestaurantWithUserData[], limit: number): RestaurantWithUserData[] {
  return [...restaurants]
    .filter((r) => r.entry?.status === "tried" && (r.entry.comments || r.entry.overall_rating !== null))
    .sort((a, b) => (b.entry?.updated_at ?? "").localeCompare(a.entry?.updated_at ?? ""))
    .slice(0, limit);
}

export interface Disagreement {
  restaurant: RestaurantWithUserData;
  userRating: number;
  mbcRating: number;
  diff: number;
}

/** Restaurants where the user's opinion diverges most from the MBC average, biggest gap first. */
export function biggestDisagreements(restaurants: RestaurantWithUserData[], limit: number): Disagreement[] {
  const withBoth = restaurants
    .filter(
      (r) =>
        r.entry?.status === "tried" && r.entry.overall_rating !== null && r.ranking?.avg_rating !== null && r.ranking?.avg_rating !== undefined,
    )
    .map((r) => ({
      restaurant: r,
      userRating: r.entry!.overall_rating as number,
      mbcRating: r.ranking!.avg_rating as number,
      diff: (r.entry!.overall_rating as number) - (r.ranking!.avg_rating as number),
    }));

  return withBoth.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, limit);
}
