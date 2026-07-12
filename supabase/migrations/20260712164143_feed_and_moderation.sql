create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  meet_id uuid references public.meets(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  media_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.feed_posts enable row level security;

create policy "feed_posts_select_authenticated" on public.feed_posts
  for select to authenticated using (true);

create policy "feed_posts_insert_own" on public.feed_posts
  for insert to authenticated with check (author_id = auth.uid());

create policy "feed_posts_update_own" on public.feed_posts
  for update to authenticated using (author_id = auth.uid());

create policy "feed_posts_delete_own" on public.feed_posts
  for delete to authenticated using (author_id = auth.uid());

create table public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.feed_likes enable row level security;

create policy "feed_likes_select_authenticated" on public.feed_likes
  for select to authenticated using (true);

create policy "feed_likes_insert_own" on public.feed_likes
  for insert to authenticated with check (user_id = auth.uid());

create policy "feed_likes_delete_own" on public.feed_likes
  for delete to authenticated using (user_id = auth.uid());

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.feed_comments enable row level security;

create policy "feed_comments_select_authenticated" on public.feed_comments
  for select to authenticated using (true);

create policy "feed_comments_insert_own" on public.feed_comments
  for insert to authenticated with check (author_id = auth.uid());

create policy "feed_comments_delete_own" on public.feed_comments
  for delete to authenticated using (author_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('feed_post','feed_comment','chat_message','dm_message','user')),
  target_id uuid not null,
  reason text not null,
  status text not null check (status in ('pending','reviewed','actioned')) default 'pending',
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
