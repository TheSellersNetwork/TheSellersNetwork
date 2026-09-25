-- Reverses 20260925001700_flair_deals_kits_streaks.sql
drop function if exists public.numbers_streak(uuid);
drop function if exists public.copy_kit(uuid);
drop policy if exists kit_items_own on public.kit_items;
drop policy if exists kit_items_select on public.kit_items;
drop policy if exists kits_own on public.kits;
drop policy if exists kits_select on public.kits;
drop table if exists public.kit_items;
drop table if exists public.kits;
drop function if exists public.deal_topics(uuid, integer);
drop policy if exists deal_votes_own on public.deal_votes;
drop policy if exists deal_votes_select on public.deal_votes;
drop table if exists public.deal_votes;
alter table public.topics drop column if exists expires_at;
alter table public.categories drop constraint if exists categories_layout_valid;
alter table public.categories drop column if exists layout;
drop trigger if exists profiles_check_flair on public.profiles;
drop function if exists public.profiles_check_flair();
alter table public.profiles drop column if exists flair;
