"use client";

import { useState, useTransition } from "react";
import { saveRestaurantReview, setRestaurantStatus } from "@/lib/actions/restaurantEntry";
import type { EntryStatus } from "@/types/database";
import { RatingSlider } from "@/components/RatingSlider";
import { CheckCircle2, Heart, CircleDashed } from "lucide-react";

interface CategoryDefinition {
  key: string;
  label: string;
}

const STATUS_OPTIONS: { value: EntryStatus; label: string; Icon: typeof CheckCircle2 }[] = [
  { value: "untried", label: "Not Tried", Icon: CircleDashed },
  { value: "want_to_try", label: "Want to Try", Icon: Heart },
  { value: "tried", label: "Tried", Icon: CheckCircle2 },
];

export function RestaurantReviewForm({
  restaurantId,
  categories,
  initialStatus,
  initialDateTried,
  initialOverallRating,
  initialComments,
  initialCategoryScores,
}: {
  restaurantId: string;
  categories: CategoryDefinition[];
  initialStatus: EntryStatus;
  initialDateTried: string | null;
  initialOverallRating: number | null;
  initialComments: string | null;
  initialCategoryScores: Record<string, number | null>;
}) {
  const [status, setStatus] = useState<EntryStatus>(initialStatus);
  const [dateTried, setDateTried] = useState(initialDateTried ?? "");
  const [overallRating, setOverallRating] = useState<number | null>(initialOverallRating);
  const [comments, setComments] = useState(initialComments ?? "");
  const [categoryScores, setCategoryScores] = useState<Record<string, number | null>>(initialCategoryScores);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleStatusClick(newStatus: EntryStatus) {
    setStatus(newStatus);
    startTransition(async () => {
      const result = await setRestaurantStatus(restaurantId, newStatus);
      setMessage(
        result.ok
          ? { type: "success", text: "Status updated." }
          : { type: "error", text: result.error ?? "Could not update status." },
      );
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveRestaurantReview(restaurantId, {
        status,
        dateTried: dateTried || null,
        overallRating,
        comments,
        categoryScores: Object.entries(categoryScores).map(([key, score]) => ({ key, score })),
      });
      setMessage(
        result.ok
          ? { type: "success", text: "Saved!" }
          : { type: "error", text: result.error ?? "Something went wrong." },
      );
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <p className="text-sm font-semibold text-char">Status</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {STATUS_OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleStatusClick(value)}
            disabled={isPending}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-bold transition ${
              status === value
                ? "bg-flame-500 text-white shadow"
                : "bg-black/5 text-char/60 hover:bg-black/10"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {status === "tried" && (
        <div className="mt-3">
          <label className="text-xs font-semibold text-char/60">Date tried</label>
          <input
            type="date"
            value={dateTried}
            onChange={(e) => setDateTried(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="mt-4 border-t border-black/5 pt-3">
        <RatingSlider label="Overall rating" value={overallRating} onChange={setOverallRating} accent="flame" />
        {categories.map((category) => (
          <RatingSlider
            key={category.key}
            label={category.label}
            value={categoryScores[category.key] ?? null}
            onChange={(value) => setCategoryScores((prev) => ({ ...prev, [category.key]: value }))}
            accent="mustard"
          />
        ))}
      </div>

      <div className="mt-3 border-t border-black/5 pt-3">
        <label className="text-xs font-semibold text-char/60">Notes</label>
        <textarea
          value={comments}
          maxLength={2000}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Juicy patty, great toasted bun, would order again..."
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <p className="mt-0.5 text-right text-[11px] text-char/40">{comments.length}/2000</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-3 w-full rounded-full bg-flame-500 py-3 text-sm font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? "Saving..." : "Save review"}
      </button>

      {message && (
        <p className={`mt-2 text-center text-sm font-semibold ${message.type === "success" ? "text-lettuce-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
