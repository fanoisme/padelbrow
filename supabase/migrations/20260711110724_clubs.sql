create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text,
  description text,
  visibility text not null check (visibility in ('public','private')) default 'public',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy "clubs_select_authenticated" on public.clubs
  for select to authenticated using (true);

create policy "clubs_insert_own" on public.clubs
  for insert to authenticated with check (owner_id = auth.uid());

create policy "clubs_update_owner" on public.clubs
  for update to authenticated using (owner_id = auth.uid());

create policy "clubs_delete_owner" on public.clubs
  for delete to authenticated using (owner_id = auth.uid());

create table public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','organizer','member')) default 'member',
  tags text[] not null default '{}',
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.club_members enable row level security;

create policy "club_members_select_authenticated" on public.club_members
  for select to authenticated using (true);

create policy "club_members_insert_own" on public.club_members
  for insert to authenticated with check (user_id = auth.uid());

create policy "club_members_delete_own_or_owner" on public.club_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id and c.owner_id = auth.uid()
    )
  );

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  price numeric not null default 0,
  period text not null check (period in ('monthly','quarterly','annual')),
  perks jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.club_memberships enable row level security;

create policy "club_memberships_select_authenticated" on public.club_memberships
  for select to authenticated using (true);

create policy "club_memberships_manage_owner_organizer" on public.club_memberships
  for all to authenticated using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_memberships.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  ) with check (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_memberships.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  );

create table public.club_membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.club_memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('active','expired','cancelled')) default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_id uuid
);

alter table public.club_membership_subscriptions enable row level security;

create policy "club_membership_subscriptions_select_own" on public.club_membership_subscriptions
  for select to authenticated using (user_id = auth.uid());

create policy "club_membership_subscriptions_insert_own" on public.club_membership_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
