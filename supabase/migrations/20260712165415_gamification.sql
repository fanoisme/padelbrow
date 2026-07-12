create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('meet_played','meet_won','hosted_meet','competition_played','referral','challenge_completed')),
  amount integer not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.xp_events enable row level security;

create policy "xp_events_select_own" on public.xp_events
  for select to authenticated using (user_id = auth.uid());

create table public.level_thresholds (
  level integer primary key,
  title text not null,
  min_xp integer not null
);

alter table public.level_thresholds enable row level security;

create policy "level_thresholds_select_all" on public.level_thresholds
  for select to authenticated, anon using (true);

insert into public.level_thresholds (level, title, min_xp) values
  (1, 'Rookie', 0),
  (2, 'Amateur', 500),
  (3, 'Pro', 2000),
  (4, 'Legend', 5000);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  tier text not null check (tier in ('bronze','silver','gold','platinum')),
  icon text,
  unlock_criteria jsonb not null default '{}'
);

alter table public.achievements enable row level security;

create policy "achievements_select_all" on public.achievements
  for select to authenticated, anon using (true);

create table public.player_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.player_achievements enable row level security;

create policy "player_achievements_select_authenticated" on public.player_achievements
  for select to authenticated using (true);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

alter table public.seasons enable row level security;

create policy "seasons_select_all" on public.seasons
  for select to authenticated, anon using (true);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  period text not null check (period in ('weekly','monthly')),
  target_criteria jsonb not null default '{}',
  xp_reward integer not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

alter table public.challenges enable row level security;

create policy "challenges_select_all" on public.challenges
  for select to authenticated, anon using (true);

create table public.player_challenge_progress (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  progress numeric not null default 0,
  completed_at timestamptz,
  primary key (challenge_id, user_id)
);

alter table public.player_challenge_progress enable row level security;

create policy "player_challenge_progress_select_own" on public.player_challenge_progress
  for select to authenticated using (user_id = auth.uid());

create policy "player_challenge_progress_insert_own" on public.player_challenge_progress
  for insert to authenticated with check (user_id = auth.uid());

create policy "player_challenge_progress_update_own" on public.player_challenge_progress
  for update to authenticated using (user_id = auth.uid());
