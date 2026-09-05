import { computeCategoryPreferences, type CategoryPreference } from "@/lib/recommendation/preferences";
import type { CandidateRestaurant } from "@/lib/recommendation/types";
import { extractRecurringWords, type KeywordSignal } from "./keywords";

const DIFF_THRESHOLD = 0.15;
const WEIGHT_THRESHOLD = 0.3;
const MIN_SAMPLE_SIZE = 2;

export interface TasteProfile {
  hasEnoughData: boolean;
  statements: string[];
  categoryPreferences: CategoryPreference[];
  keywords: KeywordSignal[];
}

/**
 * Builds an evolving, human-readable taste profile purely from the numbers
 * and comments the user has already entered -- no paid AI/LLM dependency.
 * `computeCategoryPreferences` (shared with the recommendation engine) does
 * the statistical heavy lifting; this module turns that into sentences.
 */
export function buildTasteProfile(
  triedRestaurants: CandidateRestaurant[],
  comments: { comment: string | null; overallRating: number | null }[],
): TasteProfile {
  const rated = triedRestaurants.filter((r) => r.userOverallRating !== null);
  if (rated.length < MIN_SAMPLE_SIZE) {
    return { hasEnoughData: false, statements: [], categoryPreferences: [], keywords: [] };
  }

  const preferences = computeCategoryPreferences(triedRestaurants).filter(
    (p) => p.sampleSize >= MIN_SAMPLE_SIZE,
  );

  const statements: string[] = [];

  for (const pref of preferences) {
    if (pref.diffFromMbc === null || Math.abs(pref.diffFromMbc) < DIFF_THRESHOLD) continue;
    const direction = pref.diffFromMbc > 0 ? "higher" : "lower";
    statements.push(
      `You tend to rate ${pref.label} ${direction} than the MBC average (by about ${Math.abs(pref.diffFromMbc).toFixed(1)} points, based on ${pref.sampleSize} rated visit${pref.sampleSize === 1 ? "" : "s"}).`,
    );
  }

  const topPreference = preferences.find((p) => Math.abs(p.weight) >= WEIGHT_THRESHOLD);
  if (topPreference) {
    statements.push(
      `You seem to care more about ${topPreference.label} than average -- it moves your overall rating more than your other scores do.`,
    );
  }

  const [first, second] = preferences.filter((p) => p.weight > 0);
  if (first && second) {
    const bothStrongAndHappy = rated.filter((r) => {
      const a = r.userCategoryScores.find((c) => c.key === first.key)?.score;
      const b = r.userCategoryScores.find((c) => c.key === second.key)?.score;
      return a !== undefined && a !== null && a >= 4 && b !== undefined && b !== null && b >= 4 && (r.userOverallRating ?? 0) >= 4;
    });
    if (bothStrongAndHappy.length >= 2) {
      statements.push(
        `You often give high overall scores when ${first.label} and ${second.label} are both strong.`,
      );
    }
  }

  const keywords = extractRecurringWords(comments);
  if (keywords.length > 0) {
    statements.push(`You often mention: ${keywords.map((k) => k.word).join(", ")}.`);
  }

  return { hasEnoughData: true, statements, categoryPreferences: preferences, keywords };
}
