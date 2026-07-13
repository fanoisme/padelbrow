-- Phase 7: public Storage bucket for feed post media (photos/videos).
insert into storage.buckets (id, name, public)
values ('feed-media', 'feed-media', true)
on conflict (id) do nothing;

-- Public read (feed posts are visible to all authenticated users; public bucket
-- also lets unauthenticated viewers of a shared link load the media).
create policy "feed_media_select_public" on storage.objects
  for select using (bucket_id = 'feed-media');

-- Any authenticated user may upload to their own object (owner = auth.uid()).
create policy "feed_media_insert_own" on storage.objects
  for insert to authenticated with check (bucket_id = 'feed-media');

-- Owner may delete their own media.
create policy "feed_media_delete_own" on storage.objects
  for delete to authenticated using (bucket_id = 'feed-media' and owner = auth.uid());
