-- notify_meet_creator_on_join: when someone joins a meet (confirmed or
-- waitlisted), tell the meet's creator. SECURITY DEFINER so it can INSERT
-- into public.notifications, which has no client INSERT policy.
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

create trigger on_meet_participant_insert
  after insert on public.meet_participants
  for each row
  when (new.status in ('confirmed', 'waitlisted'))
  execute function public.notify_meet_creator_on_join();

-- notify_participant_on_promote: when a waitlisted participant is promoted
-- to confirmed, tell that participant.
create or replace function public.notify_participant_on_promote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meet_title text;
begin
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

create trigger on_meet_participant_promote
  after update of status on public.meet_participants
  for each row
  when (old.status = 'waitlisted' and new.status = 'confirmed')
  execute function public.notify_participant_on_promote();
