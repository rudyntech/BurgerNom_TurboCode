import type { RestaurantWithUserData } from "@/types/database";

export type RankingsFilter = "all" | "tried" | "not_tried" | "want_to_try";
export type RankingsSort = "rank" | "score" | "my_rating";

export interface RankingsQuery {
  filter?: RankingsFilter;
  sort?: RankingsSort;
  q?: string;
}

export function filterAndSortRestaurants(
  restaurants: RestaurantWithUserData[],
  query: RankingsQuery,
): RestaurantWithUserData[] {
  const filter = query.filter ?? "all";
  const sort = query.sort ?? "rank";
  const search = query.q?.trim().toLowerCase() ?? "";

  let result = restaurants;

  if (search) {
    result = result.filter((r) => r.display_name.toLowerCase().includes(search));
  }

  if (filter === "tried") {
    result = result.filter((r) => r.entry?.status === "tried");
  } else if (filter === "not_tried") {
    result = result.filter((r) => (r.entry?.status ?? "untried") === "untried");
  } else if (filter === "want_to_try") {
    result = result.filter((r) => r.entry?.status === "want_to_try");
  }

  const sorted = [...result];
  if (sort === "score") {
    sorted.sort((a, b) => (b.ranking?.avg_rating ?? -Infinity) - (a.ranking?.avg_rating ?? -Infinity));
  } else if (sort === "my_rating") {
    sorted.sort((a, b) => (b.entry?.overall_rating ?? -Infinity) - (a.entry?.overall_rating ?? -Infinity));
  } else {
    sorted.sort((a, b) => (a.ranking?.rank ?? Infinity) - (b.ranking?.rank ?? Infinity));
  }

  return sorted;
}
