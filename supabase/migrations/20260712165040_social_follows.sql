create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

create policy "follows_select_authenticated" on public.follows
  for select to authenticated using (true);

create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
