-- Linecraft production schema (Postgres / Supabase). v1 runs on seed data; this is the target.
create table sports (key text primary key, name text not null);

create table teams (
  id uuid primary key default gen_random_uuid(),
  sport text not null references sports(key) on delete restrict,
  name text not null, abbr text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (sport, abbr)
);

create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete restrict,
  name text not null, position text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on players (team_id);

create table games (
  id uuid primary key default gen_random_uuid(),
  sport text not null references sports(key),
  home_team_id uuid not null references teams(id), away_team_id uuid not null references teams(id),
  start_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','live','final','postponed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index on games (sport, start_at);

create table player_game_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  opponent_id uuid not null references teams(id),
  is_home boolean not null,
  stats jsonb not null,
  created_at timestamptz not null default now(),
  unique (player_id, game_id)
);
create index on player_game_stats (player_id, created_at desc);

create table books (key text primary key, name text not null);

create table prop_lines (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  market text not null,
  book text not null references books(key),
  line numeric(6,1) not null,
  over_odds integer not null, under_odds integer not null,
  updated_at timestamptz not null default now(),
  unique (game_id, player_id, market, book)
);
create index on prop_lines (player_id, market);

create table prop_line_history (
  id bigint generated always as identity primary key,
  prop_line_id uuid not null references prop_lines(id) on delete cascade,
  line numeric(6,1) not null, over_odds integer not null, under_odds integer not null,
  seen_at timestamptz not null default now()
);
create index on prop_line_history (prop_line_id, seen_at);

create table defense_ranks (
  team_id uuid not null references teams(id) on delete cascade,
  position text not null, market text not null,
  allowed_per_game numeric(6,2) not null,
  rank integer not null check (rank > 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, position, market)
);

create table ratings (
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  market text not null,
  side text not null check (side in ('over','under')),
  score integer not null check (score between 0 and 100),
  inputs jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (game_id, player_id, market)
);
create index on ratings (score desc);

create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique, stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'active',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy own_sub on subscriptions for select using (user_id = auth.uid());

create table saved_props (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  market text not null, side text not null check (side in ('over','under')),
  line_at_save numeric(6,1) not null,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, player_id, market, side)
);
alter table saved_props enable row level security;
create policy own_saved on saved_props for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table stripe_events (id text primary key, received_at timestamptz not null default now());
