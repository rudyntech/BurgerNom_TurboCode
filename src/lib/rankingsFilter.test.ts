import { describe, expect, it } from "vitest";
import { filterAndSortRestaurants } from "./rankingsFilter";
import type { RestaurantWithUserData } from "@/types/database";

function makeRestaurant(overrides: {
  id: string;
  name: string;
  rank?: number;
  avgRating?: number;
  status?: "untried" | "want_to_try" | "tried";
  overallRating?: number;
}): RestaurantWithUserData {
  return {
    id: overrides.id,
    display_name: overrides.name,
    match_key: overrides.name.toLowerCase(),
    latitude: null,
    longitude: null,
    first_seen_at: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ranking: {
      restaurant_id: overrides.id,
      rank: overrides.rank ?? 1,
      avg_rating: overrides.avgRating ?? null,
      num_ratings: null,
      average_sans_overall: null,
      delta: null,
      rank_sans_overall: null,
      rank_burger_only: null,
      average_burger_only: null,
      last_rated_date: null,
      updated_at: "2024-01-01",
    },
    categoryScores: [],
    entry: overrides.status
      ? {
          id: `entry-${overrides.id}`,
          user_id: "user-1",
          restaurant_id: overrides.id,
          status: overrides.status,
          date_tried: null,
          overall_rating: overrides.overallRating ?? null,
          comments: null,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        }
      : null,
    userCategoryScores: [],
  };
}

const restaurants = [
  makeRestaurant({ id: "a", name: "Bungalow Kitchen", rank: 1, avgRating: 4.5, status: "tried", overallRating: 3.5 }),
  makeRestaurant({ id: "b", name: "Insalata's", rank: 2, avgRating: 4.4, status: "want_to_try" }),
  makeRestaurant({ id: "c", name: "Picco", rank: 3, avgRating: 4.3 }),
];

describe("filterAndSortRestaurants", () => {
  it("defaults to sorting by rank ascending with no filter", () => {
    const result = filterAndSortRestaurants(restaurants, {});
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("filters to only tried restaurants", () => {
    const result = filterAndSortRestaurants(restaurants, { filter: "tried" });
    expect(result.map((r) => r.id)).toEqual(["a"]);
  });

  it("filters to only not-tried (untried) restaurants", () => {
    const result = filterAndSortRestaurants(restaurants, { filter: "not_tried" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });

  it("filters to want-to-try restaurants", () => {
    const result = filterAndSortRestaurants(restaurants, { filter: "want_to_try" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("sorts by MBC score descending", () => {
    const result = filterAndSortRestaurants(restaurants, { sort: "score" });
    expect(result.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts by the user's own rating, restaurants without one sorting last", () => {
    const result = filterAndSortRestaurants(restaurants, { sort: "my_rating" });
    expect(result[0].id).toBe("a");
  });

  it("searches case-insensitively by name substring", () => {
    const result = filterAndSortRestaurants(restaurants, { q: "insa" });
    expect(result.map((r) => r.id)).toEqual(["b"]);
  });

  it("combines search and filter", () => {
    const result = filterAndSortRestaurants(restaurants, { q: "picco", filter: "not_tried" });
    expect(result.map((r) => r.id)).toEqual(["c"]);
  });
});
