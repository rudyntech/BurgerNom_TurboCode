import { describe, expect, it } from "vitest";
import { recommend } from "./engine";
import type { CandidateRestaurant } from "./types";

function cat(key: string, label: string, score: number | null): { key: string; label: string; score: number | null } {
  return { key, label, score };
}

function makeRestaurant(overrides: Partial<CandidateRestaurant> & { restaurantId: string }): CandidateRestaurant {
  return {
    displayName: overrides.restaurantId,
    rank: null,
    avgRating: null,
    categoryScores: [],
    status: "untried",
    userOverallRating: null,
    userCategoryScores: [],
    ...overrides,
  };
}

describe("recommend: best_untried", () => {
  it("always picks the highest MBC-rated untried restaurant first", () => {
    const restaurants: CandidateRestaurant[] = [
      makeRestaurant({ restaurantId: "a", rank: 2, avgRating: 4.3, status: "untried" }),
      makeRestaurant({ restaurantId: "b", rank: 1, avgRating: 4.6, status: "untried" }),
      makeRestaurant({ restaurantId: "c", rank: 3, avgRating: 4.0, status: "tried", userOverallRating: 4 }),
    ];
    const [top] = recommend(restaurants, { mode: "best_untried" });
    expect(top.restaurantId).toBe("b");
  });

  it("returns nothing when everything has been tried", () => {
    const restaurants: CandidateRestaurant[] = [
      makeRestaurant({ restaurantId: "a", status: "tried", userOverallRating: 4 }),
    ];
    expect(recommend(restaurants, { mode: "best_untried" })).toHaveLength(0);
  });
});

describe("recommend: next", () => {
  it("falls back to MBC ranking for a cold-start user with no ratings", () => {
    const restaurants: CandidateRestaurant[] = [
      makeRestaurant({ restaurantId: "a", rank: 5, avgRating: 4.0, status: "untried" }),
      makeRestaurant({ restaurantId: "b", rank: 1, avgRating: 4.8, status: "untried" }),
    ];
    const [top] = recommend(restaurants, { mode: "next" });
    expect(top.restaurantId).toBe("b");
    expect(top.reasons.length).toBeGreaterThan(0);
  });

  it("boosts a Want to Try restaurant over an equally-ranked alternative", () => {
    const restaurants: CandidateRestaurant[] = [
      makeRestaurant({ restaurantId: "a", rank: 3, avgRating: 4.2, status: "untried" }),
      makeRestaurant({ restaurantId: "b", rank: 3, avgRating: 4.2, status: "want_to_try" }),
    ];
    const [top] = recommend(restaurants, { mode: "next" });
    expect(top.restaurantId).toBe("b");
  });

  it("weights personal category preference more once the user has rated several restaurants", () => {
    const triedLovingPatty: CandidateRestaurant[] = [
      makeRestaurant({
        restaurantId: "t1",
        status: "tried",
        userOverallRating: 5,
        categoryScores: [cat("patty", "Patty", 4.9), cat("bun", "Bun", 3.0)],
        userCategoryScores: [cat("patty", "Patty", 5.0), cat("bun", "Bun", 3.0)],
      }),
      makeRestaurant({
        restaurantId: "t2",
        status: "tried",
        userOverallRating: 2,
        categoryScores: [cat("patty", "Patty", 2.0), cat("bun", "Bun", 4.5)],
        userCategoryScores: [cat("patty", "Patty", 1.5), cat("bun", "Bun", 4.8)],
      }),
      makeRestaurant({
        restaurantId: "t3",
        status: "tried",
        userOverallRating: 4.7,
        categoryScores: [cat("patty", "Patty", 4.7), cat("bun", "Bun", 3.2)],
        userCategoryScores: [cat("patty", "Patty", 4.8), cat("bun", "Bun", 3.0)],
      }),
    ];
    const candidates: CandidateRestaurant[] = [
      makeRestaurant({
        restaurantId: "high-patty",
        rank: 10,
        avgRating: 4.0,
        status: "untried",
        categoryScores: [cat("patty", "Patty", 4.9), cat("bun", "Bun", 2.5)],
      }),
      makeRestaurant({
        restaurantId: "high-bun",
        rank: 2,
        avgRating: 4.3,
        status: "untried",
        categoryScores: [cat("patty", "Patty", 2.5), cat("bun", "Bun", 4.9)],
      }),
    ];

    const [top] = recommend([...triedLovingPatty, ...candidates], { mode: "next" });
    expect(top.restaurantId).toBe("high-patty");
    expect(top.reasons.some((r) => r.toLowerCase().includes("patty"))).toBe(true);
  });
});

describe("recommend: surprise_me", () => {
  it("uses the injected random function so results are deterministic in tests", () => {
    const restaurants: CandidateRestaurant[] = Array.from({ length: 5 }, (_, i) =>
      makeRestaurant({ restaurantId: `r${i}`, rank: i + 1, avgRating: 4.5 - i * 0.05, status: "untried" }),
    );
    let calls = 0;
    const random = () => {
      calls += 1;
      return 0.5;
    };
    const result = recommend(restaurants, { mode: "surprise_me", random });
    expect(result.length).toBeGreaterThan(0);
    expect(calls).toBeGreaterThan(0);
    expect(result[0].reasons[0]).toMatch(/random/i);
  });
});

describe("recommend: like_favorites", () => {
  it("recommends the untried restaurant with the most similar category profile to a favorite", () => {
    const restaurants: CandidateRestaurant[] = [
      makeRestaurant({
        restaurantId: "favorite",
        status: "tried",
        userOverallRating: 5,
        categoryScores: [cat("patty", "Patty", 4.9), cat("bun", "Bun", 3.0), cat("starch", "Starch", 4.0)],
      }),
      makeRestaurant({
        restaurantId: "similar",
        status: "untried",
        categoryScores: [cat("patty", "Patty", 4.8), cat("bun", "Bun", 3.1), cat("starch", "Starch", 4.1)],
      }),
      makeRestaurant({
        restaurantId: "different",
        status: "untried",
        categoryScores: [cat("patty", "Patty", 1.0), cat("bun", "Bun", 5.0), cat("starch", "Starch", 1.0)],
      }),
    ];
    const [top] = recommend(restaurants, { mode: "like_favorites" });
    expect(top.restaurantId).toBe("similar");
  });
});
