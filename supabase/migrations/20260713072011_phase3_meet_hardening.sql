-- Phase 3 hardening: make the waitlist + capacity server-enforced, not advisory.
-- Addresses the Phase 3 final-review findings:
--   #1 self-promotion hole: the update policy had no WITH CHECK, so a waitlisted
--      user could update their own status to 'confirmed', bypassing capacity.
--   #2 TOCTOU over-fill: count-then-insert racing clients could both grab the
--      last confirmed slot.

-- #1: re-create the update policy WITH a WITH CHECK. A user may still update
-- their own row (e.g. to 'declined'), but may NOT set their own status to
-- 'confirmed' or 'waitlisted' — only the meet creator can confirm/promote.
drop policy if exists "meet_participants_update_self_or_organizer" on public.meet_participants;

create policy "meet_participants_update_self_or_organizer" on public.meet_participants
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  )
  with check (
    (user_id = auth.uid() and status not in ('confirmed', 'waitlisted'))
    or exists (select 1 from public.meets m where m.id = meet_id and m.creator_id = auth.uid())
  );

-- #2: capacity backstop. Reject any INSERT/UPDATE that would confirm a row
-- when the meet is already at max_players confirmed participants. This catches
-- the count-then-insert race at the DB regardless of client behavior.
create or replace function public.enforce_meet_capacity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_max int;
  v_confirmed int;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select m.max_players into v_max
    from public.meets m where m.id = new.meet_id;

  select count(*) into v_confirmed
    from public.meet_participants
    where meet_id = new.meet_id
      and status = 'confirmed'
      and id <> new.id;  -- exclude the row being inserted/updated

  if v_confirmed >= v_max then
    raise exception 'Meet is at capacity (max %)', v_max
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_meet_capacity_before_insert
  before insert on public.meet_participants
  for each row execute function public.enforce_meet_capacity();

create trigger enforce_meet_capacity_before_update
  before update of status on public.meet_participants
  for each row
  when (new.status = 'confirmed' and old.status <> 'confirmed')
  execute function public.enforce_meet_capacity();

-- Atomic promotion RPC. A player leaving triggers promotion of ANOTHER user's
-- waitlisted row, which the tightened update policy above would block for
-- non-creators (the leaver isn't the creator and isn't updating their own row).
-- SECURITY DEFINER lets the leaver's request promote the next waitlisted
-- participant atomically: only promotes if confirmed < max_players, eliminating
-- the client TOCTOU. Returns the promoted participant row, or null.
create or replace function public.promote_next_meet_participant(p_meet_id uuid)
returns public.meet_participants
language plpgsql
security definer set search_path = public
as $$
declare
  v_max int;
  v_confirmed int;
  v_next_id uuid;
  v_row public.meet_participants%rowtype;
begin
  select m.max_players into v_max from public.meets m where m.id = p_meet_id;
  if v_max is null then
    return null;
  end if;

  select count(*) into v_confirmed
    from public.meet_participants
    where meet_id = p_meet_id and status = 'confirmed';
  if v_confirmed >= v_max then
    return null;
  end if;

  select id into v_next_id
    from public.meet_participants
    where meet_id = p_meet_id and status = 'waitlisted'
    order by joined_at asc
    limit 1;
  if v_next_id is null then
    return null;
  end if;

  update public.meet_participants
    set status = 'confirmed'
    where id = v_next_id
    returning * into v_row;

  return v_row;
end;
$$;
