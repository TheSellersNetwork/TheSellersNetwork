-- pglite:skip
-- Reverses 20260925001000_supabase_platform.sql
drop policy if exists "members manage their own avatar" on storage.objects;
drop policy if exists "avatars are public" on storage.objects;
drop policy if exists "members delete their own post images" on storage.objects;
drop policy if exists "members upload post images to their own folder" on storage.objects;
drop policy if exists "post images are public" on storage.objects;
delete from storage.objects where bucket_id in ('post-images', 'avatars');
delete from storage.buckets where id in ('post-images', 'avatars');
select cron.unschedule('recompute-trust-levels');
