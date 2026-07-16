-- Add meet_id FK to matches so PostgREST can resolve match→meet in one hop.
-- Denormalized from match_rounds→match_sessions→meets but required for
-- PostgREST embedded-resource joins.

-- 1. Add column (nullable first so we can backfill).
alter table public.matches add column meet_id uuid references public.meets(id) on delete cascade;

-- 2. Backfill from existing match_sessions chain.
update public.matches m
   set meet_id = ms.meet_id
  from public.match_rounds mr
  join public.match_sessions ms on ms.id = mr.match_session_id
 where mr.id = m.match_round_id;

-- 3. Make NOT NULL now that all rows have a value.
alter table public.matches alter column meet_id set not null;

-- 4. Add created_at so stats queries can sort by it.
alter table public.matches add column if not exists created_at timestamptz not null default now();

-- 5. Keep it in sync: set meet_id automatically on insert via trigger.
create or replace function public.set_match_meet_id()
returns trigger as $$
begin
  if new.meet_id is null then
    select ms.meet_id into new.meet_id
      from public.match_rounds mr
      join public.match_sessions ms on ms.id = mr.match_session_id
     where mr.id = new.match_round_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_set_match_meet_id
  before insert on public.matches
  for each row execute function public.set_match_meet_id();
