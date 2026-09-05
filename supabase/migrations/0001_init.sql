-- BurgerNom initial schema
-- Official Marin Burger Club (MBC) data is kept strictly separate from
-- user-generated data so that daily re-imports can never clobber a user's
-- personal ratings, comments, or statuses.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, created automatically on signup
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- restaurants: canonical, stable-UUID restaurant/location records.
-- The MBC "Location" column already combines restaurant name + city
-- (e.g. "Bungalow Kitchen, Tiburon") -- we preserve that text verbatim as
-- `display_name` and keep a normalized `match_key` for de-duplication during
-- import. Names are NEVER used as primary keys.
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  match_key text not null unique,
  latitude double precision,
  longitude double precision,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;

create policy "restaurants are publicly readable"
  on public.restaurants for select
  using (true);

-- No insert/update/delete policies for anon/authenticated roles: writes only
-- happen server-side via the service-role key (importer), which bypasses RLS.

-- ---------------------------------------------------------------------------
-- mbc_rankings: current official MBC snapshot, one row per restaurant.
-- Re-imported/overwritten daily. Never references user data.
-- ---------------------------------------------------------------------------
create table if not exists public.mbc_rankings (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  rank integer not null,
  avg_rating numeric(4, 2),
  num_ratings integer,
  average_sans_overall numeric(4, 2),
  delta numeric(4, 2),
  rank_sans_overall integer,
  rank_burger_only integer,
  average_burger_only numeric(4, 2),
  last_rated_date date,
  updated_at timestamptz not null default now()
);

alter table public.mbc_rankings enable row level security;

create policy "mbc_rankings are publicly readable"
  on public.mbc_rankings for select
  using (true);

-- ---------------------------------------------------------------------------
-- mbc_category_scores: dynamic PBASO-style sub-scores per restaurant, derived
-- from whatever score columns are present in the source CSV at import time.
-- This lets the app adapt if MBC adds/removes/renames a rating category.
-- ---------------------------------------------------------------------------
create table if not exists public.mbc_category_scores (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_key text not null,
  category_label text not null,
  score numeric(4, 2),
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (restaurant_id, category_key)
);

alter table public.mbc_category_scores enable row level security;

create policy "mbc_category_scores are publicly readable"
  on public.mbc_category_scores for select
  using (true);

-- ---------------------------------------------------------------------------
-- user_restaurant_entries: a user's personal relationship to a restaurant.
-- One current entry per (user, restaurant).
-- ---------------------------------------------------------------------------
create table if not exists public.user_restaurant_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  status text not null default 'untried' check (status in ('untried', 'want_to_try', 'tried')),
  date_tried date,
  overall_rating numeric(4, 2) check (overall_rating is null or (overall_rating >= 0 and overall_rating <= 5)),
  comments text check (comments is null or char_length(comments) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create index if not exists user_restaurant_entries_user_id_idx on public.user_restaurant_entries (user_id);
create index if not exists user_restaurant_entries_restaurant_id_idx on public.user_restaurant_entries (restaurant_id);

alter table public.user_restaurant_entries enable row level security;

create policy "users can read their own entries"
  on public.user_restaurant_entries for select
  using (auth.uid() = user_id);

create policy "users can insert their own entries"
  on public.user_restaurant_entries for insert
  with check (auth.uid() = user_id);

create policy "users can update their own entries"
  on public.user_restaurant_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own entries"
  on public.user_restaurant_entries for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_restaurant_category_scores: a user's personal PBASO-style sub-scores,
-- tied to their entry for a restaurant. Categories are free-form text keys so
-- they can track whatever categories mbc_category_scores currently exposes.
-- ---------------------------------------------------------------------------
create table if not exists public.user_restaurant_category_scores (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.user_restaurant_entries (id) on delete cascade,
  category_key text not null,
  score numeric(4, 2) check (score is null or (score >= 0 and score <= 5)),
  updated_at timestamptz not null default now(),
  unique (entry_id, category_key)
);

create index if not exists user_restaurant_category_scores_entry_id_idx on public.user_restaurant_category_scores (entry_id);

alter table public.user_restaurant_category_scores enable row level security;

create policy "users can read their own category scores"
  on public.user_restaurant_category_scores for select
  using (
    exists (
      select 1 from public.user_restaurant_entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

create policy "users can insert their own category scores"
  on public.user_restaurant_category_scores for insert
  with check (
    exists (
      select 1 from public.user_restaurant_entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

create policy "users can update their own category scores"
  on public.user_restaurant_category_scores for update
  using (
    exists (
      select 1 from public.user_restaurant_entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

create policy "users can delete their own category scores"
  on public.user_restaurant_category_scores for delete
  using (
    exists (
      select 1 from public.user_restaurant_entries e
      where e.id = entry_id and e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- sync_runs: audit log of every MBC import attempt (cron or manual).
-- Only accessible via the service role -- no policies granted to anon/auth.
-- ---------------------------------------------------------------------------
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failure')),
  trigger text not null default 'manual' check (trigger in ('cron', 'manual')),
  restaurants_seen integer not null default 0,
  restaurants_created integer not null default 0,
  restaurants_updated integer not null default 0,
  error_message text,
  details jsonb
);

alter table public.sync_runs enable row level security;
-- Intentionally no select/insert/update policies: only the service-role key
-- (which bypasses RLS) may read or write sync history.

-- ---------------------------------------------------------------------------
-- updated_at helper trigger, applied to every mutable table
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.restaurants;
create trigger set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_restaurant_entries;
create trigger set_updated_at before update on public.user_restaurant_entries
  for each row execute function public.set_updated_at();
