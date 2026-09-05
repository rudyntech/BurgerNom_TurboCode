import type { EntryStatus } from "@/types/database";

export interface CategoryScoreInput {
  key: string;
  label: string;
  score: number | null;
}

/** A restaurant's official MBC data plus the current user's relationship to it. */
export interface CandidateRestaurant {
  restaurantId: string;
  displayName: string;
  rank: number | null;
  avgRating: number | null;
  categoryScores: CategoryScoreInput[];
  status: EntryStatus;
  userOverallRating: number | null;
  userCategoryScores: CategoryScoreInput[];
}

export type RecommendationMode = "next" | "best_untried" | "surprise_me" | "like_favorites";

export interface Recommendation {
  restaurantId: string;
  displayName: string;
  rank: number | null;
  avgRating: number | null;
  score: number;
  reasons: string[];
  mode: RecommendationMode;
}
