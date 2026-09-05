import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantDetail } from "@/lib/data/restaurants";
import { StatusPill } from "@/components/ui/StatusPill";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { RestaurantReviewForm } from "@/components/RestaurantReviewForm";
import { MapPinned } from "lucide-react";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const restaurant = await getRestaurantDetail(supabase, id);

  if (!restaurant) {
    notFound();
  }

  const mbcOverall = restaurant.ranking?.avg_rating ?? null;
  const userOverall = restaurant.entry?.overall_rating ?? null;
  const overallDiff = mbcOverall !== null && userOverall !== null ? userOverall - mbcOverall : null;

  const categories = restaurant.categoryScores.map((c) => ({ key: c.category_key, label: c.category_label }));
  const initialCategoryScores: Record<string, number | null> = Object.fromEntries(
    categories.map((c) => [
      c.key,
      restaurant.userCategoryScores.find((u) => u.category_key === c.key)?.score ?? null,
    ]),
  );

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.display_name)}`;

  return (
    <div className="pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          {restaurant.ranking?.rank !== null && restaurant.ranking?.rank !== undefined && (
            <span className="rounded-md bg-flame-50 px-2 py-0.5 text-xs font-bold text-flame-600">
              #{restaurant.ranking.rank} on MBC
            </span>
          )}
          <h1 className="mt-1 font-display text-2xl font-bold text-char">{restaurant.display_name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusPill status={restaurant.entry?.status ?? "untried"} />
          </div>
        </div>
        <RatingBadge value={mbcOverall} tone="flame" size="lg" />
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-flame-600"
      >
        <MapPinned size={16} /> Get directions
      </a>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold text-char">MBC scores vs. yours</p>
        <div className="mt-3 space-y-2">
          <ScoreRow label="Overall" mbc={mbcOverall} mine={userOverall} diff={overallDiff} />
          {restaurant.categoryScores.map((category) => {
            const mine =
              restaurant.userCategoryScores.find((u) => u.category_key === category.category_key)?.score ?? null;
            const diff = category.score !== null && mine !== null ? mine - category.score : null;
            return (
              <ScoreRow
                key={category.id}
                label={category.category_label}
                mbc={category.score}
                mine={mine}
                diff={diff}
              />
            );
          })}
        </div>
      </div>

      {restaurant.entry?.comments && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-sm font-semibold text-char">Your notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-char/70">{restaurant.entry.comments}</p>
        </div>
      )}

      <div className="mt-5">
        <RestaurantReviewForm
          restaurantId={restaurant.id}
          categories={categories}
          initialStatus={restaurant.entry?.status ?? "untried"}
          initialDateTried={restaurant.entry?.date_tried ?? null}
          initialOverallRating={userOverall}
          initialComments={restaurant.entry?.comments ?? null}
          initialCategoryScores={initialCategoryScores}
        />
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  mbc,
  mine,
  diff,
}: {
  label: string;
  mbc: number | null;
  mine: number | null;
  diff: number | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-char/70">{label}</span>
      <div className="flex items-center gap-3">
        <span className="w-16 text-right text-char/50">MBC {mbc !== null ? mbc.toFixed(1) : "—"}</span>
        <span className="w-16 text-right font-semibold text-char">You {mine !== null ? mine.toFixed(1) : "—"}</span>
        {diff !== null && (
          <span
            className={`w-14 text-right text-xs font-bold ${diff > 0 ? "text-lettuce-600" : diff < 0 ? "text-flame-600" : "text-char/40"}`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
