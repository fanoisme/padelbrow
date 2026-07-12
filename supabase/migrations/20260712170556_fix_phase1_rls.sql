-- Fix Phase 1 final-review findings (1 Critical, 3 Important) via new policies.
-- Does not edit any already-applied migration; only alters affected RLS policies.

-- ---------------------------------------------------------------------------
-- 1. CRITICAL: club_members INSERT allowed role self-assignment (privilege
--    escalation). Replace the single "insert own" policy with three
--    narrower, additive (OR'd) policies, and add a missing UPDATE policy.
-- ---------------------------------------------------------------------------

drop policy if exists "club_members_insert_own" on public.club_members;

create policy "club_members_insert_member" on public.club_members
  for insert to authenticated with check (
    user_id = auth.uid() and role = 'member'
  );

create policy "club_members_insert_owner_bootstrap" on public.club_members
  for insert to authenticated with check (
    user_id = auth.uid() and role = 'owner'
    and exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id and c.owner_id = auth.uid()
    )
  );

create policy "club_members_insert_by_owner_organizer" on public.club_members
  for insert to authenticated with check (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  );

create policy "club_members_update_owner_organizer" on public.club_members
  for update to authenticated using (
    exists (
      select 1 from public.club_members cm
      where cm.club_id = club_members.club_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner','organizer')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. IMPORTANT: player_ratings was user-writable, allowing self-inflated
--    skill ratings. These are derived/system-computed metrics; remove the
--    user-facing write policies, leaving select-only for now (writes will
--    happen via a service-role/security-definer function in a later phase).
-- ---------------------------------------------------------------------------

drop policy if exists "player_ratings_insert_own" on public.player_ratings;
drop policy if exists "player_ratings_update_own" on public.player_ratings;

-- ---------------------------------------------------------------------------
-- 3. IMPORTANT: payments UPDATE let the payer self-confirm their own
--    payment, and the organizer branch didn't cover competition organizers.
--    Split into a payer policy (can only keep status pending) and an
--    organizer policy (meet creator OR competition club owner/organizer).
-- ---------------------------------------------------------------------------

drop policy if exists "payments_update_own_or_organizer" on public.payments;

create policy "payments_update_own_while_pending" on public.payments
  for update to authenticated using (
    user_id = auth.uid()
  ) with check (
    user_id = auth.uid() and status = 'pending'
  );

create policy "payments_update_organizer" on public.payments
  for update to authenticated using (
    exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
    or exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = payments.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );
