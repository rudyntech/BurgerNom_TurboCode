import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantsForUser } from "@/lib/data/restaurants";
import { filterAndSortRestaurants, type RankingsFilter, type RankingsSort } from "@/lib/rankingsFilter";
import { BurgerCard } from "@/components/BurgerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoSubmitSelect } from "@/components/AutoSubmitSelect";

const FILTERS: { value: RankingsFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tried", label: "Tried" },
  { value: "not_tried", label: "Not Tried" },
  { value: "want_to_try", label: "Want to Try" },
];

const SORTS: { value: RankingsSort; label: string }[] = [
  { value: "rank", label: "MBC Ranking" },
  { value: "score", label: "MBC Score" },
  { value: "my_rating", label: "My Rating" },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filter = (FILTERS.find((f) => f.value === params.filter)?.value ?? "all") as RankingsFilter;
  const sort = (SORTS.find((s) => s.value === params.sort)?.value ?? "rank") as RankingsSort;
  const q = params.q ?? "";

  const supabase = await createClient();
  const restaurants = await getRestaurantsForUser(supabase);

  if (restaurants.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No rankings imported yet"
        description="The Marin Burger Club data hasn't been synced yet. Check back soon."
      />
    );
  }

  const filtered = filterAndSortRestaurants(restaurants, { filter, sort, q });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-char">Rankings</h1>
      <p className="text-sm text-char/60">The full Marin Burger Club list.</p>

      <form className="mt-4 space-y-3" method="get">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-char/40" size={18} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search restaurants..."
            className="w-full rounded-full bg-white py-3 pl-10 pr-4 text-sm shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-flame-500"
          />
        </div>
        <div className="flex gap-2">
          <AutoSubmitSelect
            name="filter"
            defaultValue={filter}
            className="flex-1 rounded-full bg-white px-3 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-flame-500"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </AutoSubmitSelect>
          <AutoSubmitSelect
            name="sort"
            defaultValue={sort}
            className="flex-1 rounded-full bg-white px-3 py-2.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-flame-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </AutoSubmitSelect>
        </div>
        <noscript>
          <button className="w-full rounded-full bg-flame-500 py-2.5 text-sm font-bold text-white">Apply</button>
        </noscript>
      </form>

      <div className="mt-4 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((r) => <BurgerCard key={r.id} restaurant={r} />)
        ) : (
          <EmptyState
            icon="🔍"
            title="No restaurants match"
            description="Try a different search term or filter."
          />
        )}
      </div>
    </div>
  );
}
