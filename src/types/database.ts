// Hand-written types mirroring supabase/migrations/*.sql. Kept in sync
// manually since this project does not depend on a paid/hosted Supabase CLI
// codegen step at build time.

export type EntryStatus = "untried" | "want_to_try" | "tried";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  display_name: string;
  match_key: string;
  latitude: number | null;
  longitude: number | null;
  first_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface MbcRanking {
  restaurant_id: string;
  rank: number;
  avg_rating: number | null;
  num_ratings: number | null;
  average_sans_overall: number | null;
  delta: number | null;
  rank_sans_overall: number | null;
  rank_burger_only: number | null;
  average_burger_only: number | null;
  last_rated_date: string | null;
  updated_at: string;
}

export interface MbcCategoryScore {
  id: string;
  restaurant_id: string;
  category_key: string;
  category_label: string;
  score: number | null;
  display_order: number;
  updated_at: string;
}

export interface UserRestaurantEntry {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: EntryStatus;
  date_tried: string | null;
  overall_rating: number | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRestaurantCategoryScore {
  id: string;
  entry_id: string;
  category_key: string;
  score: number | null;
  updated_at: string;
}

export interface SyncRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "partial" | "failure";
  trigger: "cron" | "manual";
  restaurants_seen: number;
  restaurants_created: number;
  restaurants_updated: number;
  error_message: string | null;
  details: Record<string, unknown> | null;
}

/** A restaurant merged with its current official MBC ranking + category scores. */
export interface RestaurantWithRanking extends Restaurant {
  ranking: MbcRanking | null;
  categoryScores: MbcCategoryScore[];
}

/** Everything BurgerNom knows about a restaurant, for a specific viewer. */
export interface RestaurantWithUserData extends RestaurantWithRanking {
  entry: UserRestaurantEntry | null;
  userCategoryScores: UserRestaurantCategoryScore[];
}
