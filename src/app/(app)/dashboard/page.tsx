import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantsForUser, toCandidateRestaurants } from "@/lib/data/restaurants";
import { recommend } from "@/lib/recommendation/engine";
import type { RecommendationMode } from "@/lib/recommendation/types";
import {
  computeAveragePersonalRating,
  computeCompletionStats,
  recentlyTried,
  topRatedByUser,
  wantToTryList,
} from "@/lib/stats";
import { RecommendationCard } from "@/components/RecommendationCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MiniBurgerRow } from "@/components/MiniBurgerRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListOrdered } from "lucide-react";

const VALID_MODES: RecommendationMode[] = ["next", "best_untried", "surprise_me", "like_favorites"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-char">{title}</h2>
      <div className="mt-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">{children}</div>
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: rawMode } = await searchParams;
  const mode: RecommendationMode = VALID_MODES.includes(rawMode as RecommendationMode)
    ? (rawMode as RecommendationMode)
    : "next";

  const supabase = await createClient();
  const restaurants = await getRestaurantsForUser(supabase);

  if (restaurants.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No rankings imported yet"
        description="The Marin Burger Club data hasn't been synced yet. If you're the developer, trigger a sync via /api/admin/sync with your CRON_SECRET, or wait for the daily cron job."
      />
    );
  }

  const candidates = toCandidateRestaurants(restaurants);
  const recommendations = recommend(candidates, { mode });
  const topRecommendation = recommendations[0] ?? null;

  const stats = computeCompletionStats(restaurants);
  const avgRating = computeAveragePersonalRating(restaurants);
  const recent = recentlyTried(restaurants, 3);
  const favorites = topRatedByUser(restaurants, 3, "highest");
  const wantToTry = wantToTryList(restaurants).slice(0, 5);

  return (
    <div>
      <div className="pt-1">
        <h1 className="font-display text-2xl font-bold text-char">BurgerNom</h1>
        <p className="text-sm text-char/60">Your personal Marin burger quest.</p>
      </div>

      <div className="mt-5">
        <RecommendationCard recommendation={topRecommendation} activeMode={mode} />
      </div>

      <Section title="Your progress">
        <div className="flex items-center gap-5 p-3">
          <ProgressRing percent={stats.percent} label={`${stats.percent}%`} sublabel="complete" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-char/70">
              <span className="font-bold text-char">{stats.triedCount}</span> of{" "}
              <span className="font-bold text-char">{stats.total}</span> burgers tried
            </p>
            {avgRating !== null && (
              <p className="text-char/70">
                Your average rating: <span className="font-bold text-char">{avgRating.toFixed(1)}</span>
              </p>
            )}
            <Link href="/rankings" className="mt-1 flex items-center gap-1 text-sm font-semibold text-flame-600">
              <ListOrdered size={15} /> Browse full rankings
            </Link>
          </div>
        </div>
      </Section>

      <Section title="Recently tried">
        {recent.length > 0 ? (
          <div className="divide-y divide-black/5">
            {recent.map((r) => (
              <MiniBurgerRow key={r.id} restaurant={r} showUserRating />
            ))}
          </div>
        ) : (
          <div className="p-3">
            <EmptyState
              icon="🕒"
              title="Nothing tried yet"
              description="Mark a restaurant as Tried once you've had a chance to rate it."
            />
          </div>
        )}
      </Section>

      <Section title="Your favorites">
        {favorites.length > 0 ? (
          <div className="divide-y divide-black/5">
            {favorites.map((r) => (
              <MiniBurgerRow key={r.id} restaurant={r} showUserRating />
            ))}
          </div>
        ) : (
          <div className="p-3">
            <EmptyState
              icon="⭐"
              title="No favorites yet"
              description="Your highest-rated burgers will show up here once you've rated a few."
            />
          </div>
        )}
      </Section>

      <Section title="Want to Try">
        {wantToTry.length > 0 ? (
          <div className="divide-y divide-black/5">
            {wantToTry.map((r) => (
              <MiniBurgerRow key={r.id} restaurant={r} />
            ))}
          </div>
        ) : (
          <div className="p-3">
            <EmptyState
              icon="📝"
              title="Your Want to Try list is empty"
              description="Browse the rankings and tap Want to Try on a few spots that catch your eye."
              action={
                <Link
                  href="/rankings"
                  className="mt-2 rounded-full bg-flame-500 px-4 py-2 text-sm font-bold text-white"
                >
                  Browse rankings
                </Link>
              }
            />
          </div>
        )}
      </Section>
    </div>
  );
}
