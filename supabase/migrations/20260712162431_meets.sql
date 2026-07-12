create table public.meets (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('padel','billiards','football')) default 'padel',
  format text not null check (format in ('social','americano','mexicano')) default 'social',
  title text not null,
  starts_at timestamptz not null,
  duration_minutes integer not null default 60,
  venue_name text,
  venue_address text,
  venue_lat double precision,
  venue_lng double precision,
  max_players integer not null default 4,
  privacy text not null check (privacy in ('public','private')) default 'public',
  fee_amount numeric not null default 0,
  fee_currency text not null default 'IDR',
  min_level numeric,
  max_level numeric,
  gender_restriction text,
  age_restriction text,
  repeat_rule text,
  host_role text not null check (host_role in ('host_and_play','host_only')) default 'host_and_play',
  cancellation_freeze_hours integer not null default 0,
  auto_approve boolean not null default false,
  allow_plus_one boolean not null default true,
  notes text,
  status text not null check (status in ('scheduled','completed','cancelled')) default 'scheduled',
  public_share_slug text unique,
  mvp_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.meets enable row level security;

create policy "meets_select_authenticated" on public.meets
  for select to authenticated using (true);

create policy "meets_insert_own" on public.meets
  for insert to authenticated with check (creator_id = auth.uid());

create policy "meets_update_creator" on public.meets
  for update to authenticated using (creator_id = auth.uid());

create policy "meets_delete_creator" on public.meets
  for delete to authenticated using (creator_id = auth.uid());

create table public.meet_participants (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer','player')) default 'player',
  status text not null check (status in ('confirmed','waitlisted','invited','declined')) default 'invited',
  invited_by uuid references public.profiles(id),
  is_plus_one boolean not null default false,
  joined_at timestamptz not null default now(),
  payment_status text not null check (payment_status in ('none','pending','proof_uploaded','confirmed')) default 'none',
  unique (meet_id, user_id)
);

alter table public.meet_participants enable row level security;

create policy "meet_participants_select_authenticated" on public.meet_participants
  for select to authenticated using (true);

create policy "meet_participants_insert_self_or_organizer" on public.meet_participants
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create policy "meet_participants_update_self_or_organizer" on public.meet_participants
  for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create policy "meet_participants_delete_self_or_organizer" on public.meet_participants
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

create table public.meet_polls (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  question text not null,
  type text not null check (type in ('mvp_vote','best_moment','custom')) default 'custom',
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.meet_polls enable row level security;

create policy "meet_polls_select_authenticated" on public.meet_polls
  for select to authenticated using (true);

create policy "meet_polls_manage_organizer" on public.meet_polls
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = meet_polls.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = meet_polls.meet_id and m.creator_id = auth.uid())
  );

create table public.meet_poll_votes (
  poll_id uuid not null references public.meet_polls(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  choice_user_id uuid references public.profiles(id),
  choice_text text,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id)
);

alter table public.meet_poll_votes enable row level security;

create policy "meet_poll_votes_select_authenticated" on public.meet_poll_votes
  for select to authenticated using (true);

create policy "meet_poll_votes_insert_own" on public.meet_poll_votes
  for insert to authenticated with check (voter_id = auth.uid());
