import { describe, expect, it } from "vitest";
import {
  biggestDisagreements,
  computeAveragePersonalRating,
  computeCompletionStats,
  recentReviews,
  topRatedByUser,
  wantToTryList,
} from "./stats";
import type { RestaurantWithUserData } from "@/types/database";

function makeRestaurant(overrides: {
  id: string;
  rank?: number;
  avgRating?: number;
  status?: "untried" | "want_to_try" | "tried";
  overallRating?: number;
  comments?: string;
  dateTried?: string;
  updatedAt?: string;
}): RestaurantWithUserData {
  return {
    id: overrides.id,
    display_name: overrides.id,
    match_key: overrides.id,
    latitude: null,
    longitude: null,
    first_seen_at: "2024-01-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ranking:
      overrides.rank || overrides.avgRating
        ? {
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
          }
        : null,
    categoryScores: [],
    entry: overrides.status
      ? {
          id: `entry-${overrides.id}`,
          user_id: "user-1",
          restaurant_id: overrides.id,
          status: overrides.status,
          date_tried: overrides.dateTried ?? null,
          overall_rating: overrides.overallRating ?? null,
          comments: overrides.comments ?? null,
          created_at: "2024-01-01",
          updated_at: overrides.updatedAt ?? "2024-01-01",
        }
      : null,
    userCategoryScores: [],
  };
}

describe("computeCompletionStats", () => {
  it("computes tried count, total, and rounded percent", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried" }),
      makeRestaurant({ id: "b", status: "want_to_try" }),
      makeRestaurant({ id: "c" }),
    ];
    expect(computeCompletionStats(restaurants)).toEqual({ triedCount: 1, total: 3, percent: 33 });
  });

  it("handles an empty list without dividing by zero", () => {
    expect(computeCompletionStats([])).toEqual({ triedCount: 0, total: 0, percent: 0 });
  });
});

describe("computeAveragePersonalRating", () => {
  it("averages only rated, tried restaurants", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried", overallRating: 4 }),
      makeRestaurant({ id: "b", status: "tried", overallRating: 2 }),
      makeRestaurant({ id: "c", status: "want_to_try", overallRating: 5 }),
    ];
    expect(computeAveragePersonalRating(restaurants)).toBe(3);
  });

  it("returns null when nothing has been rated", () => {
    expect(computeAveragePersonalRating([makeRestaurant({ id: "a" })])).toBeNull();
  });
});

describe("topRatedByUser", () => {
  it("sorts highest first by default", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried", overallRating: 3 }),
      makeRestaurant({ id: "b", status: "tried", overallRating: 5 }),
    ];
    expect(topRatedByUser(restaurants, 2).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("sorts lowest first when requested", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried", overallRating: 3 }),
      makeRestaurant({ id: "b", status: "tried", overallRating: 5 }),
    ];
    expect(topRatedByUser(restaurants, 2, "lowest").map((r) => r.id)).toEqual(["a", "b"]);
  });
});

describe("wantToTryList", () => {
  it("returns only want_to_try restaurants sorted by rank", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "want_to_try", rank: 5 }),
      makeRestaurant({ id: "b", status: "want_to_try", rank: 1 }),
      makeRestaurant({ id: "c", status: "tried" }),
    ];
    expect(wantToTryList(restaurants).map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("recentReviews", () => {
  it("only includes tried restaurants with a rating or comment, most recent first", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried", overallRating: 4, updatedAt: "2024-01-01" }),
      makeRestaurant({ id: "b", status: "tried", overallRating: 5, updatedAt: "2024-03-01" }),
      makeRestaurant({ id: "c", status: "want_to_try" }),
    ];
    expect(recentReviews(restaurants, 5).map((r) => r.id)).toEqual(["b", "a"]);
  });
});

describe("biggestDisagreements", () => {
  it("ranks by absolute difference between user and MBC rating", () => {
    const restaurants = [
      makeRestaurant({ id: "a", status: "tried", overallRating: 4.7, avgRating: 3.6 }),
      makeRestaurant({ id: "b", status: "tried", overallRating: 4.0, avgRating: 3.9 }),
    ];
    const result = biggestDisagreements(restaurants, 5);
    expect(result[0].restaurant.id).toBe("a");
    expect(result[0].diff).toBeCloseTo(1.1);
  });

  it("excludes restaurants missing either rating", () => {
    const restaurants = [makeRestaurant({ id: "a", status: "tried", overallRating: 4.5 })];
    expect(biggestDisagreements(restaurants, 5)).toHaveLength(0);
  });
});
