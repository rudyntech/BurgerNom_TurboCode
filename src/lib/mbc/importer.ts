import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { MbcSchemaError, type ParsedMbcCsv } from "./types";
import { parseMbcCsv } from "./parseCsv";

export interface ImportResult {
  syncRunId: string;
  status: "success" | "partial" | "failure";
  restaurantsSeen: number;
  restaurantsCreated: number;
  restaurantsUpdated: number;
  warnings: string[];
  errorMessage?: string;
}

function getMbcCsvUrl(): string {
  const url = process.env.MBC_CSV_URL;
  if (!url) {
    throw new Error("Missing required environment variable MBC_CSV_URL.");
  }
  return url;
}

async function fetchCsvText(url: string): Promise<string> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch MBC CSV: HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/**
 * Runs a full MBC rankings sync: fetch -> parse -> upsert official data.
 * Never touches user_restaurant_entries, user_restaurant_category_scores, or
 * profiles. Records a row in sync_runs regardless of outcome.
 */
export async function runMbcSync(trigger: "cron" | "manual"): Promise<ImportResult> {
  const supabase = createAdminClient();

  const { data: runRow, error: runInsertError } = await supabase
    .from("sync_runs")
    .insert({ trigger, status: "running" })
    .select("id")
    .single();

  if (runInsertError || !runRow) {
    throw new Error(`Could not create sync_runs row: ${runInsertError?.message}`);
  }
  const syncRunId = runRow.id as string;

  try {
    const csvText = await fetchCsvText(getMbcCsvUrl());
    const parsed = parseMbcCsv(csvText);
    const result = await applyImport(supabase, parsed);

    await supabase
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "success",
        restaurants_seen: result.restaurantsSeen,
        restaurants_created: result.restaurantsCreated,
        restaurants_updated: result.restaurantsUpdated,
        details: { warnings: parsed.warnings, categories: parsed.categories.map((c) => c.label) },
      })
      .eq("id", syncRunId);

    return {
      syncRunId,
      status: "success",
      restaurantsSeen: result.restaurantsSeen,
      restaurantsCreated: result.restaurantsCreated,
      restaurantsUpdated: result.restaurantsUpdated,
      warnings: parsed.warnings,
    };
  } catch (error) {
    const isSchemaError = error instanceof MbcSchemaError;
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from("sync_runs")
      .update({
        finished_at: new Date().toISOString(),
        status: "failure",
        error_message: message,
        details: { schemaError: isSchemaError },
      })
      .eq("id", syncRunId);

    return {
      syncRunId,
      status: "failure",
      restaurantsSeen: 0,
      restaurantsCreated: 0,
      restaurantsUpdated: 0,
      warnings: [],
      errorMessage: message,
    };
  }
}

async function applyImport(
  supabase: SupabaseClient,
  parsed: ParsedMbcCsv,
): Promise<{ restaurantsSeen: number; restaurantsCreated: number; restaurantsUpdated: number }> {
  const matchKeys = parsed.rows.map((r) => r.matchKey);

  const { data: existingRestaurants, error: existingError } = await supabase
    .from("restaurants")
    .select("id, match_key")
    .in("match_key", matchKeys);
  if (existingError) throw new Error(`Lookup existing restaurants failed: ${existingError.message}`);

  const existingKeySet = new Set((existingRestaurants ?? []).map((r) => r.match_key as string));

  const { data: existingRankings, error: existingRankingsError } = await supabase
    .from("mbc_rankings")
    .select("restaurant_id, rank, avg_rating");
  if (existingRankingsError) {
    throw new Error(`Lookup existing rankings failed: ${existingRankingsError.message}`);
  }
  const rankingById = new Map(
    (existingRankings ?? []).map((r) => [r.restaurant_id as string, r]),
  );

  // 1. Upsert restaurants (additive/safe: only display_name + match_key).
  const { data: upsertedRestaurants, error: restaurantUpsertError } = await supabase
    .from("restaurants")
    .upsert(
      parsed.rows.map((r) => ({ display_name: r.rawLocation, match_key: r.matchKey })),
      { onConflict: "match_key" },
    )
    .select("id, match_key");
  if (restaurantUpsertError) {
    throw new Error(`Upserting restaurants failed: ${restaurantUpsertError.message}`);
  }

  const restaurantIdByMatchKey = new Map(
    (upsertedRestaurants ?? []).map((r) => [r.match_key as string, r.id as string]),
  );

  // 2. Upsert current ranking snapshot per restaurant.
  const rankingRows = parsed.rows
    .map((r) => {
      const restaurantId = restaurantIdByMatchKey.get(r.matchKey);
      if (!restaurantId) return null;
      return {
        restaurant_id: restaurantId,
        rank: r.rank,
        avg_rating: r.avgRating,
        num_ratings: r.numRatings,
        average_sans_overall: r.averageSansOverall,
        delta: r.delta,
        rank_sans_overall: r.rankSansOverall,
        rank_burger_only: r.rankBurgerOnly,
        average_burger_only: r.averageBurgerOnly,
        last_rated_date: r.lastRatedDate,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const { error: rankingUpsertError } = await supabase
    .from("mbc_rankings")
    .upsert(rankingRows, { onConflict: "restaurant_id" });
  if (rankingUpsertError) {
    throw new Error(`Upserting rankings failed: ${rankingUpsertError.message}`);
  }

  // 3. Upsert category scores (dynamic PBASO-style columns).
  const categoryScoreRows = parsed.rows.flatMap((r) => {
    const restaurantId = restaurantIdByMatchKey.get(r.matchKey);
    if (!restaurantId) return [];
    return r.categoryScores.map((c) => ({
      restaurant_id: restaurantId,
      category_key: c.key,
      category_label: c.label,
      score: c.score,
      display_order: c.order,
      updated_at: new Date().toISOString(),
    }));
  });

  if (categoryScoreRows.length > 0) {
    const { error: categoryUpsertError } = await supabase
      .from("mbc_category_scores")
      .upsert(categoryScoreRows, { onConflict: "restaurant_id,category_key" });
    if (categoryUpsertError) {
      throw new Error(`Upserting category scores failed: ${categoryUpsertError.message}`);
    }
  }

  // 4. Prune category keys that no longer exist in the source (schema
  // evolution), across all restaurants. Official data only -- never touches
  // user_restaurant_category_scores.
  const currentCategoryKeys = parsed.categories.map((c) => c.key);
  if (currentCategoryKeys.length > 0) {
    const { error: pruneError } = await supabase
      .from("mbc_category_scores")
      .delete()
      .not("category_key", "in", `(${currentCategoryKeys.map((k) => `"${k}"`).join(",")})`);
    if (pruneError) {
      throw new Error(`Pruning stale category scores failed: ${pruneError.message}`);
    }
  }

  const restaurantsCreated = parsed.rows.filter((r) => !existingKeySet.has(r.matchKey)).length;
  const restaurantsUpdated = parsed.rows.filter((r) => {
    const restaurantId = restaurantIdByMatchKey.get(r.matchKey);
    if (!restaurantId || !existingKeySet.has(r.matchKey)) return false;
    const previous = rankingById.get(restaurantId);
    if (!previous) return true;
    return previous.rank !== r.rank || Number(previous.avg_rating) !== r.avgRating;
  }).length;

  return {
    restaurantsSeen: parsed.rows.length,
    restaurantsCreated,
    restaurantsUpdated,
  };
}
