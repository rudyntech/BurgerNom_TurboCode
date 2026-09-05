import { computeCategoryPreferences } from "./preferences";
import type { CandidateRestaurant, Recommendation, RecommendationMode } from "./types";

const MIN_RATED_FOR_PERSONALIZATION = 2;
const MAX_PERSONAL_WEIGHT = 0.75;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function mbcDesirability(candidate: CandidateRestaurant, maxRank: number): number {
  if (candidate.avgRating !== null) return clamp01(candidate.avgRating / 5);
  if (candidate.rank !== null && maxRank > 0) return clamp01((maxRank + 1 - candidate.rank) / maxRank);
  return 0.5;
}

/** Deterministic pseudo-random value in [0, 1) derived from a restaurant id, used only as a stable tiebreaker. */
function stableJitter(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const key of keys) {
    const av = a.get(key) ?? 0;
    const bv = b.get(key) ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function toVector(scores: { key: string; score: number | null }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of scores) {
    if (s.score !== null) map.set(s.key, s.score);
  }
  return map;
}

interface ScoredCandidate {
  candidate: CandidateRestaurant;
  score: number;
  reasons: string[];
}

/**
 * Core weighted scoring used by "next" mode and as the candidate pool for
 * "surprise_me". Blends MBC ranking with learned personal category
 * preferences; the more the user has rated, the more personal taste matters
 * relative to the raw MBC score.
 */
function scoreCandidates(
  untried: CandidateRestaurant[],
  tried: CandidateRestaurant[],
  maxRank: number,
): ScoredCandidate[] {
  const preferences = computeCategoryPreferences(tried).filter((p) => p.sampleSize >= MIN_RATED_FOR_PERSONALIZATION);
  const ratedCount = tried.filter((r) => r.userOverallRating !== null).length;
  const personalWeight = Math.min(MAX_PERSONAL_WEIGHT, ratedCount / 8);
  const mbcWeight = 1 - personalWeight;

  return untried.map((candidate) => {
    const reasons: string[] = [];
    const mbcScore = mbcDesirability(candidate, maxRank);

    let personalScore = 0;
    let personalScoreWeightSum = 0;
    const topPreferences = preferences.slice(0, 3);
    for (const pref of topPreferences) {
      if (pref.weight === 0) continue;
      const candidateCategory = candidate.categoryScores.find((c) => c.key === pref.key);
      if (!candidateCategory || candidateCategory.score === null) continue;
      const normalized = clamp01(candidateCategory.score / 5);
      // A negative weight means the user rates lower when this category is
      // strong (rare, but possible with noisy small samples) -- still fold
      // it in symmetrically rather than special-casing it.
      personalScore += normalized * pref.weight;
      personalScoreWeightSum += Math.abs(pref.weight);

      if (Math.abs(pref.weight) > 0.35) {
        const direction = pref.weight > 0 ? "above" : "below";
        reasons.push(
          `You tend to rate restaurants with strong ${pref.label} scores ${direction} average, and this is one of the highest ${pref.label} scores among places you haven't tried.`,
        );
      }
    }
    const normalizedPersonalScore = personalScoreWeightSum > 0 ? personalScore / personalScoreWeightSum : 0.5;

    const wantToTryBonus = candidate.status === "want_to_try" ? 0.12 : 0;
    if (wantToTryBonus > 0) {
      reasons.push("It's already on your Want to Try list.");
    }

    if (candidate.rank !== null && candidate.rank <= Math.max(5, Math.round(maxRank * 0.1))) {
      reasons.push(`It's ranked #${candidate.rank} on the Marin Burger Club list.`);
    }

    const jitter = stableJitter(candidate.restaurantId) * 0.03;
    const score =
      mbcWeight * mbcScore + personalWeight * normalizedPersonalScore + wantToTryBonus + jitter;

    if (reasons.length === 0) {
      reasons.push(
        candidate.avgRating !== null
          ? `It has a strong MBC average rating of ${candidate.avgRating.toFixed(2)} and you haven't tried it yet.`
          : "It's a highly-ranked burger you haven't tried yet.",
      );
    }

    return { candidate, score, reasons };
  });
}

function toRecommendation(scored: ScoredCandidate, mode: RecommendationMode): Recommendation {
  return {
    restaurantId: scored.candidate.restaurantId,
    displayName: scored.candidate.displayName,
    rank: scored.candidate.rank,
    avgRating: scored.candidate.avgRating,
    score: scored.score,
    reasons: scored.reasons,
    mode,
  };
}

export interface RecommendOptions {
  mode: RecommendationMode;
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number;
}

/**
 * Produces a ranked list of recommendations (best first) for the given mode.
 * Callers typically show only the top result, but the full list is returned
 * so the UI can offer alternates.
 */
export function recommend(
  allRestaurants: CandidateRestaurant[],
  options: RecommendOptions,
): Recommendation[] {
  const untried = allRestaurants.filter((r) => r.status !== "tried");
  const tried = allRestaurants.filter((r) => r.status === "tried");
  if (untried.length === 0) return [];

  const maxRank = Math.max(1, ...allRestaurants.map((r) => r.rank ?? 0));
  const random = options.random ?? Math.random;

  switch (options.mode) {
    case "best_untried": {
      const scored = untried
        .map((candidate) => ({
          candidate,
          score: mbcDesirability(candidate, maxRank),
          reasons: [
            candidate.rank !== null
              ? `It's the highest-ranked burger you haven't tried (#${candidate.rank} on the MBC list).`
              : "It has the strongest MBC average rating among restaurants you haven't tried.",
          ],
        }))
        .sort((a, b) => b.score - a.score);
      return scored.map((s) => toRecommendation(s, "best_untried"));
    }

    case "surprise_me": {
      const scored = scoreCandidates(untried, tried, maxRank).sort((a, b) => b.score - a.score);
      const poolSize = Math.max(1, Math.min(scored.length, Math.ceil(scored.length * 0.4)));
      const pool = scored.slice(0, poolSize);
      const shuffled = [...pool].sort(() => random() - 0.5);
      const withSurpriseReason = shuffled.map((s) => ({
        ...s,
        reasons: [
          "Picked at random from your strongest untried options, to keep your burger quest varied.",
          ...s.reasons,
        ],
      }));
      return withSurpriseReason.map((s) => toRecommendation(s, "surprise_me"));
    }

    case "like_favorites": {
      const favorites = [...tried]
        .filter((r) => r.userOverallRating !== null)
        .sort((a, b) => (b.userOverallRating ?? 0) - (a.userOverallRating ?? 0))
        .slice(0, 3);

      if (favorites.length === 0) {
        const scored = scoreCandidates(untried, tried, maxRank).sort((a, b) => b.score - a.score);
        return scored.map((s) => toRecommendation(s, "like_favorites"));
      }

      const favoriteVectors = favorites.map((f) => ({
        restaurant: f,
        vector: toVector(f.categoryScores),
      }));

      const scored = untried.map((candidate) => {
        const candidateVector = toVector(candidate.categoryScores);
        let bestSimilarity = -1;
        let mostSimilarFavorite = favoriteVectors[0].restaurant;
        for (const fav of favoriteVectors) {
          const similarity = cosineSimilarity(candidateVector, fav.vector);
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            mostSimilarFavorite = fav.restaurant;
          }
        }
        const normalizedSimilarity = clamp01((bestSimilarity + 1) / 2);
        return {
          candidate,
          score: normalizedSimilarity,
          reasons: [
            `Its rating profile looks similar to "${mostSimilarFavorite.displayName}", one of your favorites.`,
          ],
        };
      });

      return scored
        .sort((a, b) => b.score - a.score)
        .map((s) => toRecommendation(s, "like_favorites"));
    }

    case "next":
    default: {
      const scored = scoreCandidates(untried, tried, maxRank).sort((a, b) => b.score - a.score);
      return scored.map((s) => toRecommendation(s, "next"));
    }
  }
}
