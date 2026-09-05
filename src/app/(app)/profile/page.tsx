import { createClient } from "@/lib/supabase/server";
import { getRestaurantsForUser, toCandidateRestaurants } from "@/lib/data/restaurants";
import {
  biggestDisagreements,
  computeAveragePersonalRating,
  computeCompletionStats,
  recentReviews,
  topRatedByUser,
  wantToTryList,
} from "@/lib/stats";
import { buildTasteProfile } from "@/lib/tasteProfile/engine";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MiniBurgerRow } from "@/components/MiniBurgerRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { RatingBadge } from "@/components/ui/RatingBadge";
import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-char">{title}</h2>
      <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">{children}</div>
    </section>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const restaurants = await getRestaurantsForUser(supabase);

  const stats = computeCompletionStats(restaurants);
  const avgRating = computeAveragePersonalRating(restaurants);
  const highest = topRatedByUser(restaurants, 5, "highest");
  const lowest = topRatedByUser(restaurants, 5, "lowest");
  const wantToTry = wantToTryList(restaurants);
  const reviews = recentReviews(restaurants, 5);
  const disagreements = biggestDisagreements(restaurants, 5);

  const candidates = toCandidateRestaurants(restaurants);
  const tried = candidates.filter((c) => c.status === "tried");
  const comments = restaurants
    .filter((r) => r.entry?.status === "tried")
    .map((r) => ({ comment: r.entry?.comments ?? null, overallRating: r.entry?.overall_rating ?? null }));
  const tasteProfile = buildTasteProfile(tried, comments);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-char">Profile</h1>
      <p className="text-sm text-char/60">{user?.email}</p>

      <Section title="Your quest">
        <div className="flex items-center gap-5">
          <ProgressRing percent={stats.percent} label={`${stats.percent}%`} sublabel="complete" />
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-bold">{stats.triedCount}</span> tried of{" "}
              <span className="font-bold">{stats.total}</span> total
            </p>
            <p>
              <span className="font-bold">{wantToTry.length}</span> on your Want to Try list
            </p>
            {avgRating !== null && (
              <p>
                Average personal rating: <span className="font-bold">{avgRating.toFixed(1)}</span>
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section title="Your evolving taste profile">
        {tasteProfile.hasEnoughData && tasteProfile.statements.length > 0 ? (
          <ul className="space-y-2 text-sm text-char/80">
            {tasteProfile.statements.map((statement, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true">🍔</span>
                <span>{statement}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="🧠"
            title="Still learning your taste"
            description="Rate a few more burgers (with their Patty/Bun/etc. scores) and BurgerNom will start noticing patterns."
          />
        )}
      </Section>

      <Section title="Highest rated">
        {highest.length > 0 ? (
          <div className="divide-y divide-black/5">
            {highest.map((r) => (
              <MiniBurgerRow key={r.id} restaurant={r} showUserRating />
            ))}
          </div>
        ) : (
          <p className="text-sm text-char/50">Nothing rated yet.</p>
        )}
      </Section>

      <Section title="Lowest rated">
        {lowest.length > 0 ? (
          <div className="divide-y divide-black/5">
            {lowest.map((r) => (
              <MiniBurgerRow key={r.id} restaurant={r} showUserRating />
            ))}
          </div>
        ) : (
          <p className="text-sm text-char/50">Nothing rated yet.</p>
        )}
      </Section>

      <Section title="Biggest disagreements with MBC">
        {disagreements.length > 0 ? (
          <ul className="space-y-3">
            {disagreements.map(({ restaurant, userRating, mbcRating, diff }) => (
              <li key={restaurant.id} className="text-sm">
                <Link href={`/restaurants/${restaurant.id}`} className="font-semibold text-char hover:underline">
                  {restaurant.display_name}
                </Link>
                <p className="text-char/60">
                  You gave it <span className="font-bold">{userRating.toFixed(1)}</span> while MBC gives it{" "}
                  <span className="font-bold">{mbcRating.toFixed(1)}</span> ({diff > 0 ? "+" : ""}
                  {diff.toFixed(1)}).
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-char/50">Rate a few more burgers to see how your taste compares.</p>
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
          <p className="text-sm text-char/50">Nothing on your list yet.</p>
        )}
      </Section>

      <Section title="Recent reviews">
        {reviews.length > 0 ? (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id}>
                <div className="flex items-center justify-between">
                  <Link href={`/restaurants/${r.id}`} className="font-semibold text-char hover:underline">
                    {r.display_name}
                  </Link>
                  <RatingBadge value={r.entry?.overall_rating ?? null} tone="mustard" size="sm" />
                </div>
                {r.entry?.comments && <p className="mt-0.5 text-sm text-char/60">{r.entry.comments}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-char/50">No reviews yet.</p>
        )}
      </Section>
    </div>
  );
}
