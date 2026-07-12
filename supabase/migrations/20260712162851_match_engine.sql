create table public.match_sessions (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  format text not null check (format in ('americano','mexicano','team_americano','singles')),
  ranking_criteria text not null check (ranking_criteria in ('matches_won','points_won','win_pct','points_pct')) default 'matches_won',
  num_courts integer not null default 1,
  total_set_points integer not null default 21,
  prioritize_least_matches boolean not null default true,
  status text not null check (status in ('setup','in_progress','completed')) default 'setup',
  created_at timestamptz not null default now()
);

alter table public.match_sessions enable row level security;

create policy "match_sessions_select_authenticated" on public.match_sessions
  for select to authenticated using (true);

create policy "match_sessions_manage_organizer" on public.match_sessions
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = match_sessions.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = match_sessions.meet_id and m.creator_id = auth.uid())
  );

create table public.match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_session_id uuid not null references public.match_sessions(id) on delete cascade,
  round_number integer not null,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.match_rounds enable row level security;

create policy "match_rounds_select_authenticated" on public.match_rounds
  for select to authenticated using (true);

create policy "match_rounds_manage_organizer" on public.match_rounds
  for all to authenticated using (
    exists (
      select 1 from public.match_sessions ms
      join public.meets m on m.id = ms.meet_id
      where ms.id = match_rounds.match_session_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.match_sessions ms
      join public.meets m on m.id = ms.meet_id
      where ms.id = match_rounds.match_session_id and m.creator_id = auth.uid()
    )
  );

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_round_id uuid not null references public.match_rounds(id) on delete cascade,
  court_number integer not null default 1,
  score_a integer,
  score_b integer,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.matches enable row level security;

create policy "matches_select_authenticated" on public.matches
  for select to authenticated using (true);

create policy "matches_manage_organizer" on public.matches
  for all to authenticated using (
    exists (
      select 1 from public.match_rounds mr
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where mr.id = matches.match_round_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.match_rounds mr
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where mr.id = matches.match_round_id and m.creator_id = auth.uid()
    )
  );

create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('a','b')),
  primary key (match_id, user_id)
);

alter table public.match_players enable row level security;

create policy "match_players_select_authenticated" on public.match_players
  for select to authenticated using (true);

create policy "match_players_manage_organizer" on public.match_players
  for all to authenticated using (
    exists (
      select 1 from public.matches ma
      join public.match_rounds mr on mr.id = ma.match_round_id
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where ma.id = match_players.match_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.matches ma
      join public.match_rounds mr on mr.id = ma.match_round_id
      join public.match_sessions ms on ms.id = mr.match_session_id
      join public.meets m on m.id = ms.meet_id
      where ma.id = match_players.match_id and m.creator_id = auth.uid()
    )
  );

create table public.player_ratings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  rating numeric not null default 3.0,
  matches_played integer not null default 0,
  reliability_pct numeric not null default 0,
  last_updated timestamptz not null default now()
);

alter table public.player_ratings enable row level security;

create policy "player_ratings_select_authenticated" on public.player_ratings
  for select to authenticated using (true);

create policy "player_ratings_insert_own" on public.player_ratings
  for insert to authenticated with check (user_id = auth.uid());

create policy "player_ratings_update_own" on public.player_ratings
  for update to authenticated using (user_id = auth.uid());
