-- pglite:skip
-- Pieces that only exist on a real Supabase project: pg_cron schedules and
-- Storage buckets. Skipped by the PGlite harness.
-- Down: supabase/migrations/down/20260925001000_supabase_platform.sql

create extension if not exists pg_cron with schema pg_catalog;

-- Nightly at 03:15 UK server time (Supabase runs in UTC).
select cron.schedule('recompute-trust-levels', '15 3 * * *', $$select public.recompute_trust_levels()$$);

-- Storage: post images and avatars. Public read, authenticated write to own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

create policy "post images are public"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "members upload post images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_suspended_now(auth.uid())
  );

create policy "members delete their own post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars are public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "members manage their own avatar"
  on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
