-- Fix follow-up to 20260716120000_meet_guest_players.sql: making
-- match_players.user_id / meet_participants.user_id nullable (for guests)
-- broke three SECURITY DEFINER functions that assumed user_id was always
-- present and would try to insert a guest's null user_id into a NOT NULL
-- column (player_ratings.user_id, xp_events.user_id, notifications.user_id),
-- failing the whole match-finalize / promote transaction. A fourth function
-- silently produced a blank participant name for guests. Guests intentionally
-- don't accumulate ratings/XP/notifications (no account to attach them to),
-- but the rest of each function's behavior for real players is unchanged.

-- apply_match_result: exclude guests (match_players.user_id is null) from
-- the per-team arrays used to build/insert player_ratings rows. Score
-- recording and match status still finalize normally regardless of whether
-- a guest played.
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

  -- Guests (match_players.user_id is null) have no profiles row to attach
  -- an Elo rating to, so they're excluded from these arrays entirely.
  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'a' and mp.user_id is not null) into v_team_a
  from public.match_players mp where mp.match_id = p_match_id;
  select array_agg(mp.user_id order by mp.user_id) filter (where mp.team = 'b' and mp.user_id is not null) into v_team_b
  from public.match_players mp where mp.match_id = p_match_id;

  -- Average rating per team (default 3.0 for a wholly-unrated or all-guest team).
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

  -- Team A (opponent avg = v_avg_b). coalesce to an empty array guards a
  -- wholly-guest team, where v_team_a is null after the filter above
  -- (FOREACH over a null array raises "FOREACH expression must not be null").
  foreach v_player in array coalesce(v_team_a, array[]::uuid[]) loop
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
  foreach v_player in array coalesce(v_team_b, array[]::uuid[]) loop
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

-- award_match_xp: same idea — exclude guests (null user_id) from the
-- per-team arrays used to award XP. Real players are awarded XP unchanged.
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
    select array_agg(mp.user_id) filter (where mp.team = 'a' and mp.user_id is not null) into v_team_a
    from public.match_players mp where mp.match_id = NEW.id;
    select array_agg(mp.user_id) filter (where mp.team = 'b' and mp.user_id is not null) into v_team_b
    from public.match_players mp where mp.match_id = NEW.id;

    foreach v_pid in array coalesce(v_team_a, array[]::uuid[]) loop
      perform public.award_xp(v_pid, 'meet_played', 10, jsonb_build_object('match_id', NEW.id));
    end loop;
    foreach v_pid in array coalesce(v_team_b, array[]::uuid[]) loop
      perform public.award_xp(v_pid, 'meet_played', 10, jsonb_build_object('match_id', NEW.id));
    end loop;

    if NEW.score_a > NEW.score_b then
      foreach v_pid in array coalesce(v_team_a, array[]::uuid[]) loop
        perform public.award_xp(v_pid, 'meet_won', 20, jsonb_build_object('match_id', NEW.id));
      end loop;
    elsif NEW.score_b > NEW.score_a then
      foreach v_pid in array coalesce(v_team_b, array[]::uuid[]) loop
        perform public.award_xp(v_pid, 'meet_won', 20, jsonb_build_object('match_id', NEW.id));
      end loop;
    end if;
  end if;
  return NEW;
end;
$$;

-- notify_participant_on_promote: a guest participant (user_id is null) has
-- no account to receive a notification, so skip the insert entirely.
create or replace function public.notify_participant_on_promote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meet_title text;
begin
  if new.user_id is null then
    return new;
  end if;

  select m.title into v_meet_title
  from public.meets m where m.id = new.meet_id;

  insert into public.notifications (user_id, type, payload)
  values (
    new.user_id,
    'waitlist_promoted',
    jsonb_build_object(
      'meet_id', new.meet_id,
      'meet_title', coalesce(v_meet_title, '')
    )
  );
  return new;
end;
$$;

-- notify_meet_creator_on_join: fall back to the guest_name captured on the
-- meet_participants row when the joiner is a guest (no profiles row to
-- look up a full_name from).
create or replace function public.notify_meet_creator_on_join()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_creator_id uuid;
  v_meet_title text;
  v_participant_name text;
begin
  select m.creator_id, m.title into v_creator_id, v_meet_title
  from public.meets m where m.id = new.meet_id;

  select p.full_name into v_participant_name
  from public.profiles p where p.id = new.user_id;

  v_participant_name := coalesce(v_participant_name, new.guest_name);

  insert into public.notifications (user_id, type, payload)
  values (
    v_creator_id,
    'meet_join',
    jsonb_build_object(
      'meet_id', new.meet_id,
      'meet_title', coalesce(v_meet_title, ''),
      'participant_id', new.user_id,
      'participant_name', coalesce(v_participant_name, '')
    )
  );
  return new;
end;
$$;
