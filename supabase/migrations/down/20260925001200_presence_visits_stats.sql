-- Reverses 20260925001200_presence_visits_stats.sql
drop function if exists public.category_unread_counts();
drop function if exists public.community_stats();
drop function if exists public.online_members(integer, integer);
drop function if exists public.touch_presence();
drop policy if exists category_visits_own on public.category_visits;
drop table if exists public.category_visits;
alter table public.profiles drop column if exists home_visited_at;
