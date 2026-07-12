create table public.meet_expenses (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.meets(id) on delete cascade,
  label text not null,
  total_amount numeric not null,
  split_method text not null check (split_method in ('equal','custom')) default 'equal',
  created_at timestamptz not null default now()
);

alter table public.meet_expenses enable row level security;

create policy "meet_expenses_select_authenticated" on public.meet_expenses
  for select to authenticated using (true);

create policy "meet_expenses_manage_organizer" on public.meet_expenses
  for all to authenticated using (
    exists (select 1 from public.meets m where m.id = meet_expenses.meet_id and m.creator_id = auth.uid())
  ) with check (
    exists (select 1 from public.meets m where m.id = meet_expenses.meet_id and m.creator_id = auth.uid())
  );

create table public.meet_expense_shares (
  id uuid primary key default gen_random_uuid(),
  meet_expense_id uuid not null references public.meet_expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_owed numeric not null,
  unique (meet_expense_id, user_id)
);

alter table public.meet_expense_shares enable row level security;

create policy "meet_expense_shares_select_authenticated" on public.meet_expense_shares
  for select to authenticated using (true);

create policy "meet_expense_shares_manage_organizer" on public.meet_expense_shares
  for all to authenticated using (
    exists (
      select 1 from public.meet_expenses me
      join public.meets m on m.id = me.meet_id
      where me.id = meet_expense_shares.meet_expense_id and m.creator_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.meet_expenses me
      join public.meets m on m.id = me.meet_id
      where me.id = meet_expense_shares.meet_expense_id and m.creator_id = auth.uid()
    )
  );

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid references public.meets(id) on delete cascade,
  competition_id uuid references public.competitions(id) on delete cascade,
  membership_subscription_id uuid references public.club_membership_subscriptions(id) on delete cascade,
  expense_share_id uuid references public.meet_expense_shares(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  proof_url text,
  status text not null check (status in ('pending','confirmed','rejected')) default 'pending',
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_select_own_or_organizer" on public.payments
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
    or exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = payments.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

create policy "payments_insert_own" on public.payments
  for insert to authenticated with check (user_id = auth.uid());

create policy "payments_update_own_or_organizer" on public.payments
  for update to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
  );

alter table public.club_membership_subscriptions
  add constraint club_membership_subscriptions_payment_fk
  foreign key (payment_id) references public.payments(id) on delete set null;
