-- Phase 4: finalize a match + apply Elo rating deltas server-side.
-- player_ratings has NO client write policy (Phase 1 RLS fix removed it), so
-- rating updates MUST go through this SECURITY DEFINER function.
create or replace function public.apply_match_result(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
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
  select m.score_a, m.score_b, m.status into v_score_a, v_score_b, v_status
  from public.matches m where m.id = p_match_id for update;

  if not found then
    raise exception 'match not found';
  end if;
  if v_score_a is null or v_score_b is null then
    raise exception 'cannot finalize a match without scores';
  end if;

  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'a') into v_team_a
  from public.match_players mp where mp.match_id = p_match_id;
  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'b') into v_team_b
  from public.match_players mp where mp.match_id = p_match_id;

  select coalesce(avg(pr.rating), 3.0) into v_avg_a
  from public.player_ratings pr where pr.user_id = any(v_team_a);
  select coalesce(avg(pr.rating), 3.0) into v_avg_b
  from public.player_ratings pr where pr.user_id = any(v_team_b);

  update public.matches set status = 'completed' where id = p_match_id;

  v_actual := case when v_score_a > v_score_b then 1.0 else 0.0 end;

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
