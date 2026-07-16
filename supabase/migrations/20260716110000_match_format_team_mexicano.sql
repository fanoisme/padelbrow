-- Wizard offers team_mexicano + generators support it, but the original
-- match_sessions.format CHECK omitted it → insert failed silently.
alter table public.match_sessions drop constraint if exists match_sessions_format_check;
alter table public.match_sessions
  add constraint match_sessions_format_check
  check (format in ('americano','mexicano','team_americano','team_mexicano','singles'));
