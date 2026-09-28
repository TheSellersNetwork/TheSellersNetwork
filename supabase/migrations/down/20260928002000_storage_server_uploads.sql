-- pglite:skip
-- Reverses 20260928002000_storage_server_uploads.sql
drop policy if exists "members delete their own avatar" on storage.objects;

create policy "members upload post images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_suspended_now(auth.uid())
  );

create policy "members manage their own avatar"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'] where id = 'post-images';
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'] where id = 'avatars';
