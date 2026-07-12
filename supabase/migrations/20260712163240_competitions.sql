create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('padel','billiards','football')) default 'padel',
  format text not null check (format in ('single_elim','double_elim','round_robin','groups')),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer,
  fee_amount numeric not null default 0,
  status text not null check (status in ('draft','registration_open','in_progress','completed')) default 'draft',
  public_share_slug text unique,
  created_at timestamptz not null default now()
);

alter table public.competitions enable row level security;

create policy "competitions_select_authenticated" on public.competitions
  for select to authenticated using (true);

create policy "competitions_manage_owner_organizer" on public.competitions
  for all to authenticated using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = competitions.club_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = competitions.club_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  name text not null,
  player_ids uuid[] not null default '{}'
);

alter table public.competition_teams enable row level security;

create policy "competition_teams_select_authenticated" on public.competition_teams
  for select to authenticated using (true);

create policy "competition_teams_manage_organizer" on public.competition_teams
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_teams.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_teams.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_registrations (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.competition_teams(id) on delete cascade,
  seed integer,
  status text not null check (status in ('pending','confirmed')) default 'pending',
  primary key (competition_id, team_id)
);

alter table public.competition_registrations enable row level security;

create policy "competition_registrations_select_authenticated" on public.competition_registrations
  for select to authenticated using (true);

create policy "competition_registrations_manage_organizer" on public.competition_registrations
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_registrations.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_registrations.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create table public.competition_matches (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_name text not null,
  bracket_position integer not null default 0,
  team_a_id uuid references public.competition_teams(id),
  team_b_id uuid references public.competition_teams(id),
  score_a integer,
  score_b integer,
  court text,
  scheduled_at timestamptz,
  status text not null check (status in ('pending','completed')) default 'pending'
);

alter table public.competition_matches enable row level security;

create policy "competition_matches_select_authenticated" on public.competition_matches
  for select to authenticated using (true);

create policy "competition_matches_manage_organizer" on public.competition_matches
  for all to authenticated using (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_matches.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = competition_matches.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );
