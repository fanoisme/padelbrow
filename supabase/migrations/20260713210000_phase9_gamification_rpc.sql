-- award_xp: server-side-only XP insertion. NOT granted to authenticated —
-- clients must not self-award. Called by the match-finalize trigger below.
create or replace function public.award_xp(p_user_id uuid, p_source text, p_amount integer, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.xp_events (user_id, source, amount, meta)
  values (p_user_id, p_source, p_amount, coalesce(p_meta, '{}'::jsonb));
end;
$$;

-- Trigger: award XP when a match transitions pending -> completed.
create or replace function public.award_match_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_a uuid[];
  v_team_b uuid[];
  v_pid uuid;
begin
  if (OLD.status is distinct from 'completed' and NEW.status = 'completed') then
    select array_agg(mp.user_id) filter (where mp.team = 'a') into v_team_a
    from public.match_players mp where mp.match_id = NEW.id;
    select array_agg(mp.user_id) filter (where mp.team = 'b') into v_team_b
    from public.match_players mp where mp.match_id = NEW.id;

    foreach v_pid in array v_team_a loop
      perform public.award_xp(v_pid, 'meet_played', 10, jsonb_build_object('match_id', NEW.id));
    end loop;
    foreach v_pid in array v_team_b loop
      perform public.award_xp(v_pid, 'meet_played', 10, jsonb_build_object('match_id', NEW.id));
    end loop;

    if NEW.score_a > NEW.score_b then
      foreach v_pid in array v_team_a loop
        perform public.award_xp(v_pid, 'meet_won', 20, jsonb_build_object('match_id', NEW.id));
      end loop;
    elsif NEW.score_b > NEW.score_a then
      foreach v_pid in array v_team_b loop
        perform public.award_xp(v_pid, 'meet_won', 20, jsonb_build_object('match_id', NEW.id));
      end loop;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_matches_award_xp on public.matches;
create trigger trg_matches_award_xp
  after update on public.matches
  for each row execute function public.award_match_xp();

-- Trigger: unlock 'first_match' on the user's first meet_played XP event.
create or replace function public.unlock_first_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ach uuid;
begin
  if NEW.source = 'meet_played' then
    select id into v_ach from public.achievements where key = 'first_match';
    if v_ach is not null then
      insert into public.player_achievements (user_id, achievement_id)
      values (NEW.user_id, v_ach)
      on conflict do nothing;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_xp_unlock_first_match on public.xp_events;
create trigger trg_xp_unlock_first_match
  after insert on public.xp_events
  for each row execute function public.unlock_first_match();

-- Seed achievements (idempotent on key).
insert into public.achievements (key, name, description, tier, unlock_criteria) values
  ('first_match', 'First Match', 'Play your first match', 'bronze', '{"type":"meet_played","count":1}'),
  ('first_win', 'First Win', 'Win your first match', 'bronze', '{"type":"meet_won","count":1}'),
  ('ten_matches', 'Veteran', 'Play 10 matches', 'silver', '{"type":"meet_played","count":10}'),
  ('century', 'Centurion', 'Play 100 matches', 'platinum', '{"type":"meet_played","count":100}')
on conflict (key) do nothing;

-- Seed challenges (idempotent on key). Wide windows so they're "active" now.
insert into public.challenges (key, title, description, period, target_criteria, xp_reward, starts_at, ends_at) values
  ('play_3_weekly', 'Play 3 this week', 'Play 3 matches this week', 'weekly', '{"type":"meet_played","count":3}', 50, now() - interval '1 day', now() + interval '7 days'),
  ('win_5_monthly', 'Win 5 this month', 'Win 5 matches this month', 'monthly', '{"type":"meet_won","count":5}', 150, now() - interval '1 day', now() + interval '30 days')
on conflict (key) do nothing;
