"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EntryStatus } from "@/types/database";

const VALID_STATUSES: EntryStatus[] = ["untried", "want_to_try", "tried"];
const MAX_COMMENT_LENGTH = 2000;

function clampScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(5, value));
}

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to do that.");
  return user.id;
}

function revalidateRestaurantViews(restaurantId: string) {
  revalidatePath(`/restaurants/${restaurantId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rankings");
  revalidatePath("/profile");
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Quick status change -- usable from a browse-list card or the detail page. */
export async function setRestaurantStatus(
  restaurantId: string,
  status: EntryStatus,
): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_restaurant_entries")
      .upsert(
        { user_id: userId, restaurant_id: restaurantId, status },
        { onConflict: "user_id,restaurant_id" },
      );
    if (error) throw new Error(error.message);

    revalidateRestaurantViews(restaurantId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Same as {@link setRestaurantStatus}, but discards the result so it can be bound directly to a <form action>. */
export async function quickSetRestaurantStatus(
  restaurantId: string,
  status: EntryStatus,
): Promise<void> {
  await setRestaurantStatus(restaurantId, status);
}

export interface SaveReviewInput {
  status: EntryStatus;
  dateTried: string | null;
  overallRating: number | null;
  comments: string | null;
  categoryScores: { key: string; score: number | null }[];
}

/** Full review save: status, date tried, overall + per-category ratings, and comments. */
export async function saveRestaurantReview(
  restaurantId: string,
  input: SaveReviewInput,
): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(input.status)) {
    return { ok: false, error: "Invalid status." };
  }
  if (input.comments && input.comments.length > MAX_COMMENT_LENGTH) {
    return { ok: false, error: `Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.` };
  }
  if (input.dateTried && Number.isNaN(Date.parse(input.dateTried))) {
    return { ok: false, error: "Invalid date." };
  }

  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: entry, error: entryError } = await supabase
      .from("user_restaurant_entries")
      .upsert(
        {
          user_id: userId,
          restaurant_id: restaurantId,
          status: input.status,
          date_tried: input.dateTried,
          overall_rating: clampScore(input.overallRating),
          comments: input.comments?.trim() ? input.comments.trim() : null,
        },
        { onConflict: "user_id,restaurant_id" },
      )
      .select("id")
      .single();
    if (entryError || !entry) throw new Error(entryError?.message ?? "Could not save entry.");

    const categoryRows = input.categoryScores
      .filter((c) => c.key.trim() !== "")
      .map((c) => ({ entry_id: entry.id, category_key: c.key, score: clampScore(c.score) }));

    if (categoryRows.length > 0) {
      const { error: categoryError } = await supabase
        .from("user_restaurant_category_scores")
        .upsert(categoryRows, { onConflict: "entry_id,category_key" });
      if (categoryError) throw new Error(categoryError.message);
    }

    revalidateRestaurantViews(restaurantId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}
