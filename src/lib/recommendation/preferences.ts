import type { CandidateRestaurant } from "./types";

export interface CategoryPreference {
  key: string;
  label: string;
  /** How strongly this category tracks the user's overall rating, roughly in [-1, 1] after normalization. */
  weight: number;
  /** Average (user score - MBC score) for restaurants where both are known. */
  diffFromMbc: number | null;
  sampleSize: number;
}

/**
 * Learns, per rating category, how much it seems to drive this user's
 * overall enjoyment (via covariance with their overall ratings) and how
 * their scores compare to MBC's average scores for the same restaurants.
 *
 * Pure and side-effect free so it can be unit tested and reused by both the
 * recommendation engine and the taste profile.
 */
export function computeCategoryPreferences(
  triedRestaurants: CandidateRestaurant[],
): CategoryPreference[] {
  const categoryKeys = new Set<string>();
  const labelByKey = new Map<string, string>();
  for (const r of triedRestaurants) {
    for (const c of r.userCategoryScores) {
      categoryKeys.add(c.key);
      labelByKey.set(c.key, c.label);
    }
  }

  const overallRatings = triedRestaurants
    .map((r) => r.userOverallRating)
    .filter((v): v is number => v !== null);
  const meanOverall =
    overallRatings.length > 0 ? overallRatings.reduce((a, b) => a + b, 0) / overallRatings.length : null;

  const preferences: CategoryPreference[] = [];

  for (const key of categoryKeys) {
    const pairs: { userScore: number; overall: number }[] = [];
    const mbcDiffs: number[] = [];

    for (const r of triedRestaurants) {
      const userCategory = r.userCategoryScores.find((c) => c.key === key);
      if (!userCategory || userCategory.score === null) continue;

      if (r.userOverallRating !== null) {
        pairs.push({ userScore: userCategory.score, overall: r.userOverallRating });
      }

      const mbcCategory = r.categoryScores.find((c) => c.key === key);
      if (mbcCategory?.score !== null && mbcCategory?.score !== undefined) {
        mbcDiffs.push(userCategory.score - mbcCategory.score);
      }
    }

    let weight = 0;
    if (pairs.length >= 2 && meanOverall !== null) {
      const meanUserScore = pairs.reduce((a, b) => a + b.userScore, 0) / pairs.length;
      const meanPairOverall = pairs.reduce((a, b) => a + b.overall, 0) / pairs.length;
      const covariance =
        pairs.reduce((sum, p) => sum + (p.userScore - meanUserScore) * (p.overall - meanPairOverall), 0) /
        pairs.length;
      weight = covariance;
    }

    preferences.push({
      key,
      label: labelByKey.get(key) ?? key,
      weight,
      diffFromMbc: mbcDiffs.length > 0 ? mbcDiffs.reduce((a, b) => a + b, 0) / mbcDiffs.length : null,
      sampleSize: pairs.length,
    });
  }

  const maxAbsWeight = Math.max(1e-6, ...preferences.map((p) => Math.abs(p.weight)));
  return preferences
    .map((p) => ({ ...p, weight: p.weight / maxAbsWeight }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}
