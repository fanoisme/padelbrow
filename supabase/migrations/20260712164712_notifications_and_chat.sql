create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_select_participant" on public.chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.meet_participants mp
      where mp.meet_id = chat_messages.meet_id and mp.user_id = auth.uid()
    )
    or exists (select 1 from public.meets m where m.id = chat_messages.meet_id and m.creator_id = auth.uid())
  );

create policy "chat_messages_insert_participant" on public.chat_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.meet_participants mp
        where mp.meet_id = chat_messages.meet_id and mp.user_id = auth.uid()
      )
      or exists (select 1 from public.meets m where m.id = chat_messages.meet_id and m.creator_id = auth.uid())
    )
  );

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

alter table public.dm_threads enable row level security;

create policy "dm_threads_select_own" on public.dm_threads
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

create policy "dm_threads_insert_own" on public.dm_threads
  for insert to authenticated with check (
    (user_a = auth.uid() or user_b = auth.uid())
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = user_a and b.blocked_id = user_b)
         or (b.blocker_id = user_b and b.blocked_id = user_a)
    )
  );

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.dm_messages enable row level security;

create policy "dm_messages_select_thread_member" on public.dm_messages
  for select to authenticated using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

create policy "dm_messages_insert_thread_member" on public.dm_messages
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );
