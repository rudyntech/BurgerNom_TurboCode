import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MbcCategoryScore,
  MbcRanking,
  RestaurantWithUserData,
  UserRestaurantCategoryScore,
  UserRestaurantEntry,
} from "@/types/database";
import type { CandidateRestaurant } from "@/lib/recommendation/types";

const RESTAURANT_SELECT = `
  id,
  display_name,
  match_key,
  latitude,
  longitude,
  first_seen_at,
  created_at,
  updated_at,
  mbc_rankings ( restaurant_id, rank, avg_rating, num_ratings, average_sans_overall, delta, rank_sans_overall, rank_burger_only, average_burger_only, last_rated_date, updated_at ),
  mbc_category_scores ( id, restaurant_id, category_key, category_label, score, display_order, updated_at ),
  user_restaurant_entries ( id, user_id, restaurant_id, status, date_tried, overall_rating, comments, created_at, updated_at,
    user_restaurant_category_scores ( id, entry_id, category_key, score, updated_at )
  )
`;

type RawRestaurantRow = {
  id: string;
  display_name: string;
  match_key: string;
  latitude: number | null;
  longitude: number | null;
  first_seen_at: string;
  created_at: string;
  updated_at: string;
  mbc_rankings: MbcRanking | MbcRanking[] | null;
  mbc_category_scores: MbcCategoryScore[] | null;
  user_restaurant_entries: (UserRestaurantEntry & {
    user_restaurant_category_scores: UserRestaurantCategoryScore[] | null;
  })[] | null;
};

function normalize(row: RawRestaurantRow): RestaurantWithUserData {
  const ranking = Array.isArray(row.mbc_rankings) ? row.mbc_rankings[0] ?? null : row.mbc_rankings;
  const entry = row.user_restaurant_entries?.[0] ?? null;
  return {
    id: row.id,
    display_name: row.display_name,
    match_key: row.match_key,
    latitude: row.latitude,
    longitude: row.longitude,
    first_seen_at: row.first_seen_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ranking: ranking ?? null,
    categoryScores: [...(row.mbc_category_scores ?? [])].sort((a, b) => a.display_order - b.display_order),
    entry: entry
      ? {
          id: entry.id,
          user_id: entry.user_id,
          restaurant_id: entry.restaurant_id,
          status: entry.status,
          date_tried: entry.date_tried,
          overall_rating: entry.overall_rating,
          comments: entry.comments,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        }
      : null,
    userCategoryScores: entry?.user_restaurant_category_scores ?? [],
  };
}

/** All restaurants with official MBC data and (if signed in) the current user's personal data, ranked ascending. */
export async function getRestaurantsForUser(
  supabase: SupabaseClient,
): Promise<RestaurantWithUserData[]> {
  const { data, error } = await supabase.from("restaurants").select(RESTAURANT_SELECT);
  if (error) throw new Error(`Failed to load restaurants: ${error.message}`);

  const rows = (data ?? []) as unknown as RawRestaurantRow[];
  return rows
    .map(normalize)
    .sort((a, b) => {
      const rankA = a.ranking?.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.ranking?.rank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.display_name.localeCompare(b.display_name);
    });
}

export async function getRestaurantDetail(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<RestaurantWithUserData | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("id", restaurantId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load restaurant: ${error.message}`);
  if (!data) return null;
  return normalize(data as unknown as RawRestaurantRow);
}

/** Adapts loaded restaurant rows into the shape the recommendation/taste-profile engines expect. */
export function toCandidateRestaurants(restaurants: RestaurantWithUserData[]): CandidateRestaurant[] {
  return restaurants.map((r) => ({
    restaurantId: r.id,
    displayName: r.display_name,
    rank: r.ranking?.rank ?? null,
    avgRating: r.ranking?.avg_rating ?? null,
    categoryScores: r.categoryScores.map((c) => ({ key: c.category_key, label: c.category_label, score: c.score })),
    status: r.entry?.status ?? "untried",
    userOverallRating: r.entry?.overall_rating ?? null,
    userCategoryScores: r.userCategoryScores.map((c) => {
      const label = r.categoryScores.find((mc) => mc.category_key === c.category_key)?.category_label ?? c.category_key;
      return { key: c.category_key, label, score: c.score };
    }),
  }));
}
