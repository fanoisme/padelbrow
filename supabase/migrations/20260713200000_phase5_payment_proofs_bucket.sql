insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

create policy "payment_proofs_select_public" on storage.objects
  for select using (bucket_id = 'payment-proofs');

create policy "payment_proofs_insert_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'payment-proofs' and owner = auth.uid());

create policy "payment_proofs_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'payment-proofs' and owner = auth.uid());
