import Link from "next/link";
import type { Recommendation, RecommendationMode } from "@/lib/recommendation/types";
import { RatingBadge } from "@/components/ui/RatingBadge";

const MODES: { key: RecommendationMode; label: string }[] = [
  { key: "next", label: "What should I try next?" },
  { key: "best_untried", label: "Best untried" },
  { key: "surprise_me", label: "Surprise me" },
  { key: "like_favorites", label: "Like my favorites" },
];

export function RecommendationCard({
  recommendation,
  activeMode,
}: {
  recommendation: Recommendation | null;
  activeMode: RecommendationMode;
}) {
  return (
    <section className="rounded-3xl bg-char p-5 text-cream shadow-lg sm:p-6">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map(({ key, label }) => (
          <Link
            key={key}
            href={`/dashboard?mode=${key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeMode === key ? "bg-flame-500 text-white" : "bg-white/10 text-cream/70 hover:bg-white/20"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {recommendation ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-cream/50">Try next</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl">
              {recommendation.displayName}
            </h2>
            <RatingBadge value={recommendation.avgRating} tone="mustard" size="lg" />
          </div>
          {recommendation.rank !== null && (
            <p className="mt-1 text-sm text-cream/60">#{recommendation.rank} on the MBC list</p>
          )}
          <ul className="mt-4 space-y-1.5 text-sm text-cream/80">
            {recommendation.reasons.map((reason, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden="true">💭</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/restaurants/${recommendation.restaurantId}`}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-flame-500 px-5 py-3 text-sm font-bold text-white shadow-md active:scale-[0.98]"
          >
            View restaurant →
          </Link>
        </div>
      ) : (
        <div className="mt-5 text-center">
          <p className="font-display text-xl font-bold">You&rsquo;ve tried everything on the list! 🎉</p>
          <p className="mt-1 text-sm text-cream/60">
            Check back after the next Marin Burger Club update, or revisit an old favorite.
          </p>
        </div>
      )}
    </section>
  );
}
