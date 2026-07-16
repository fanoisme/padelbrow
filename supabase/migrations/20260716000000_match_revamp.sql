-- Match revamp: add team_mexicano format + join-by-code.
-- Forward-only. Keeps 'singles' valid in the DB (UI no longer surfaces it)
-- so any existing singles sessions keep loading.

-- 1. Widen the format check to include team_mexicano.
alter table public.match_sessions drop constraint if exists match_sessions_format_check;
alter table public.match_sessions
  add constraint match_sessions_format_check check (
    format in ('americano','mexicano','team_americano','team_mexicano','singles')
  );

-- 2. join_code: short shareable code per session. DB-generated so every row
--    (including future inserts) always has one; the client never supplies it.
alter table public.match_sessions add column join_code text;
update public.match_sessions
   set join_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
 where join_code is null;
alter table public.match_sessions alter column join_code set not null;
alter table public.match_sessions
  alter column join_code set default upper(substr(md5(gen_random_uuid()::text), 1, 8));
create unique index match_sessions_join_code_key on public.match_sessions(join_code);
