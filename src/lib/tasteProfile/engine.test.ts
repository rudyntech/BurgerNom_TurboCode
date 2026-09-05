import { describe, expect, it } from "vitest";
import { buildTasteProfile } from "./engine";
import type { CandidateRestaurant } from "@/lib/recommendation/types";

function cat(key: string, label: string, score: number | null) {
  return { key, label, score };
}

function makeTried(overrides: Partial<CandidateRestaurant> & { restaurantId: string }): CandidateRestaurant {
  return {
    displayName: overrides.restaurantId,
    rank: null,
    avgRating: null,
    categoryScores: [],
    status: "tried",
    userOverallRating: null,
    userCategoryScores: [],
    ...overrides,
  };
}

describe("buildTasteProfile", () => {
  it("reports insufficient data for a brand-new user", () => {
    const profile = buildTasteProfile([], []);
    expect(profile.hasEnoughData).toBe(false);
    expect(profile.statements).toHaveLength(0);
  });

  it("detects that the user rates a category higher than MBC on average", () => {
    const tried: CandidateRestaurant[] = [
      makeTried({
        restaurantId: "a",
        userOverallRating: 4.5,
        categoryScores: [cat("patty", "Patty", 3.5)],
        userCategoryScores: [cat("patty", "Patty", 4.8)],
      }),
      makeTried({
        restaurantId: "b",
        userOverallRating: 4.0,
        categoryScores: [cat("patty", "Patty", 3.0)],
        userCategoryScores: [cat("patty", "Patty", 4.5)],
      }),
    ];
    const profile = buildTasteProfile(tried, []);
    expect(profile.hasEnoughData).toBe(true);
    expect(profile.statements.some((s) => s.includes("Patty") && s.includes("higher"))).toBe(true);
  });

  it("surfaces recurring comment keywords", () => {
    const tried: CandidateRestaurant[] = [
      makeTried({ restaurantId: "a", userOverallRating: 5 }),
      makeTried({ restaurantId: "b", userOverallRating: 4.5 }),
    ];
    const comments = [
      { comment: "so juicy and smoky flavor", overallRating: 5 },
      { comment: "incredibly juicy and smoky", overallRating: 4.5 },
    ];
    const profile = buildTasteProfile(tried, comments);
    expect(profile.statements.some((s) => s.startsWith("You often mention"))).toBe(true);
  });
});
