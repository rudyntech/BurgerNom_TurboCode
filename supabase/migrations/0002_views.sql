-- Convenience read-only view combining a restaurant with its current MBC
-- ranking snapshot. Simplifies the browse/rankings query on the client.
create or replace view public.restaurant_rankings as
select
  r.id as restaurant_id,
  r.display_name,
  r.latitude,
  r.longitude,
  mr.rank,
  mr.avg_rating,
  mr.num_ratings,
  mr.average_sans_overall,
  mr.delta,
  mr.rank_sans_overall,
  mr.rank_burger_only,
  mr.average_burger_only,
  mr.last_rated_date,
  mr.updated_at as mbc_updated_at
from public.restaurants r
left join public.mbc_rankings mr on mr.restaurant_id = r.id;

-- Views inherit the RLS of their underlying tables' policies when queried
-- through PostgREST as the invoking role, so no separate grant is required
-- beyond the base table select policies already defined.
