-- Tighten payments update: participants could previously self-confirm via the
-- own-or-organizer policy. Status changes now go through confirm_payment (which
-- does its own organizer check under SECURITY DEFINER). Participants may still
-- INSERT their own payment (payments_insert_own) but cannot UPDATE it.
drop policy if exists "payments_update_own_or_organizer" on public.payments;

create policy "payments_update_organizer" on public.payments
  for update to authenticated using (
    exists (select 1 from public.meets m where m.id = payments.meet_id and m.creator_id = auth.uid())
    or exists (
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = payments.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    )
  );

-- confirm_payment: organizer-only status change. SECURITY DEFINER bypasses RLS,
-- so the organizer check is explicit. Idempotent (no-op if already in status).
create or replace function public.confirm_payment(p_payment_id uuid, p_status text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
  v_is_organizer boolean := false;
begin
  select * into v_row from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found';
  end if;

  if v_row.meet_id is not null then
    select exists(
      select 1 from public.meets m where m.id = v_row.meet_id and m.creator_id = auth.uid()
    ) into v_is_organizer;
  elsif v_row.competition_id is not null then
    select exists(
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = v_row.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    ) into v_is_organizer;
  end if;

  if not v_is_organizer then
    raise exception 'only the organizer can confirm or reject a payment';
  end if;

  if p_status not in ('confirmed','rejected') then
    raise exception 'p_status must be confirmed or rejected';
  end if;

  -- Idempotent: no-op if already in the requested status.
  if v_row.status = p_status then
    return v_row;
  end if;

  update public.payments
    set status = p_status,
        confirmed_by = auth.uid(),
        confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end
    where id = p_payment_id
    returning * into v_row;

  return v_row;
end;
$$;

-- send_payment_reminder: organizer-only. Inserts a notification for the payer.
-- notifications has no insert RLS policy, so this RPC is the only client path.
create or replace function public.send_payment_reminder(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
  v_is_organizer boolean := false;
begin
  select * into v_row from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found';
  end if;

  if v_row.meet_id is not null then
    select exists(
      select 1 from public.meets m where m.id = v_row.meet_id and m.creator_id = auth.uid()
    ) into v_is_organizer;
  elsif v_row.competition_id is not null then
    select exists(
      select 1 from public.competitions co
      join public.club_members cm on cm.club_id = co.club_id
      where co.id = v_row.competition_id and cm.user_id = auth.uid() and cm.role in ('owner','organizer')
    ) into v_is_organizer;
  end if;

  if not v_is_organizer then
    raise exception 'only the organizer can send a payment reminder';
  end if;

  insert into public.notifications (user_id, type, payload)
  values (v_row.user_id, 'payment_reminder', jsonb_build_object(
    'meet_id', v_row.meet_id,
    'competition_id', v_row.competition_id,
    'amount', v_row.amount
  ));
end;
$$;

grant execute on function public.confirm_payment(uuid, text) to authenticated;
grant execute on function public.send_payment_reminder(uuid) to authenticated;
