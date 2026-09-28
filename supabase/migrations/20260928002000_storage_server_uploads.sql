-- pglite:skip
-- Uploads go through the server only, which re-encodes images to strip
-- location data and other metadata. Members can no longer write to Storage
-- directly. Reading stays public; members can still delete their own files.
-- Down: supabase/migrations/down/20260928002000_storage_server_uploads.sql

drop policy if exists "members upload post images to their own folder" on storage.objects;
drop policy if exists "members manage their own avatar" on storage.objects;

create policy "members delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

update storage.buckets set allowed_mime_types = array['image/webp'] where id in ('post-images', 'avatars');
