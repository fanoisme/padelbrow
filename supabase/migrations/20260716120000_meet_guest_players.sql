-- Allow a meet_participants row to represent a guest (no account): user_id
-- becomes optional, guest_name fills in for a guest. Exactly one of the two
-- must be set.
alter table public.meet_participants
  alter column user_id drop not null;

alter table public.meet_participants
  add column guest_name text;

alter table public.meet_participants
  add constraint meet_participants_identity_check
    check ((user_id is not null) <> (guest_name is not null));

-- match_players needs the same treatment so a guest can be assigned into a
-- match. Since a guest has no profiles row, guest players are referenced via
-- their meet_participants row instead of user_id. The old composite primary
-- key (match_id, user_id) can't represent a null user_id, so replace it with
-- a surrogate id + two per-identity unique constraints (Postgres unique
-- constraints ignore rows where the constrained column is null, so a real
-- player and a guest can each have their own uniqueness guarantee without
-- colliding).
alter table public.match_players drop constraint match_players_pkey;

alter table public.match_players
  add column id uuid primary key default gen_random_uuid();

alter table public.match_players
  alter column user_id drop not null;

alter table public.match_players
  add column guest_participant_id uuid references public.meet_participants(id) on delete cascade;

alter table public.match_players
  add constraint match_players_identity_check
    check ((user_id is not null) <> (guest_participant_id is not null));

alter table public.match_players
  add constraint match_players_match_user_unique unique (match_id, user_id);

alter table public.match_players
  add constraint match_players_match_guest_unique unique (match_id, guest_participant_id);
