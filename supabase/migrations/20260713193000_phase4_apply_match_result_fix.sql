-- Phase 4 fix: harden apply_match_result.
-- C1 (Critical): SECURITY DEFINER bypasses RLS, so the function had no auth
--   check — any authenticated user could finalize ANY match and apply Elo to
--   other players' ratings. Now enforces meets.creator_id = auth.uid().
-- C2 (Critical): re-finalizing double-counted Elo (rating += delta, matches_played
--   ++ each call). Now a no-op if the match is already completed.
-- M1 (Minor): ties now count as 0.5 for both teams (was: team-A loss / team-B win).
create or replace function public.apply_match_result(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_creator uuid;
  v_team_a uuid[];
  v_team_b uuid[];
  v_score_a int;
  v_score_b int;
  v_avg_a numeric;
  v_avg_b numeric;
  v_player uuid;
  v_my_rating numeric;
  v_opp_avg numeric;
  v_actual numeric;
  v_expected numeric;
  v_delta numeric;
  v_k numeric := 0.5;
  v_scale numeric := 1.5;
begin
  -- Lock + load the match.
  select m.score_a, m.score_b, m.status into v_score_a, v_score_b, v_status
  from public.matches m where m.id = p_match_id for update;

  if not found then
    raise exception 'match not found';
  end if;
  if v_score_a is null or v_score_b is null then
    raise exception 'cannot finalize a match without scores';
  end if;

  -- C1: enforce organizer (SECURITY DEFINER bypasses matches RLS).
  select mt.creator_id into v_creator
  from public.matches ma
  join public.match_rounds mr on mr.id = ma.match_round_id
  join public.match_sessions ms on ms.id = mr.match_session_id
  join public.meets mt on mt.id = ms.meet_id
  where ma.id = p_match_id;

  if v_creator is null or v_creator <> auth.uid() then
    raise exception 'only the meet organizer can finalize a match';
  end if;

  -- C2: idempotent — no-op if already finalized.
  if v_status = 'completed' then
    return;
  end if;

  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'a') into v_team_a
  from public.match_players mp where mp.match_id = p_match_id;
  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'b') into v_team_b
  from public.match_players mp where mp.match_id = p_match_id;

  -- Average rating per team (default 3.0 for a wholly-unrated team).
  select coalesce(avg(pr.rating), 3.0) into v_avg_a
  from public.player_ratings pr where pr.user_id = any(v_team_a);
  select coalesce(avg(pr.rating), 3.0) into v_avg_b
  from public.player_ratings pr where pr.user_id = any(v_team_b);

  update public.matches set status = 'completed' where id = p_match_id;

  -- M1: tie = 0.5 for both teams.
  v_actual := case
    when v_score_a > v_score_b then 1.0
    when v_score_a = v_score_b then 0.5
    else 0.0
  end;

  -- Team A (opponent avg = v_avg_b).
  foreach v_player in array v_team_a loop
    select rating into v_my_rating from public.player_ratings where user_id = v_player;
    v_my_rating := coalesce(v_my_rating, 3.0);
    v_opp_avg := v_avg_b;
    v_expected := 1.0 / (1.0 + power(10.0, (v_opp_avg - v_my_rating) / v_scale));
    v_delta := v_k * (v_actual - v_expected);
    insert into public.player_ratings (user_id, rating, matches_played, reliability_pct, last_updated)
    values (v_player, 3.0 + v_delta, 1, 0, now())
    on conflict (user_id) do update
      set rating = player_ratings.rating + v_delta,
          matches_played = player_ratings.matches_played + 1,
          last_updated = now();
  end loop;

  -- Team B (opponent avg = v_avg_a; actual inverted).
  v_actual := 1.0 - v_actual;
  foreach v_player in array v_team_b loop
    select rating into v_my_rating from public.player_ratings where user_id = v_player;
    v_my_rating := coalesce(v_my_rating, 3.0);
    v_opp_avg := v_avg_a;
    v_expected := 1.0 / (1.0 + power(10.0, (v_opp_avg - v_my_rating) / v_scale));
    v_delta := v_k * (v_actual - v_expected);
    insert into public.player_ratings (user_id, rating, matches_played, reliability_pct, last_updated)
    values (v_player, 3.0 + v_delta, 1, 0, now())
    on conflict (user_id) do update
      set rating = player_ratings.rating + v_delta,
          matches_played = player_ratings.matches_played + 1,
          last_updated = now();
  end loop;
end;
$$;

grant execute on function public.apply_match_result(uuid) to authenticated;
