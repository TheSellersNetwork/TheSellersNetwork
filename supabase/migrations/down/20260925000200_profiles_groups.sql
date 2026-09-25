-- Reverses 20260925000200_profiles_groups.sql
drop function if exists public.is_member_of_group(uuid);
drop function if exists public.is_suspended_now(uuid);
drop function if exists public.current_trust_level();
drop function if exists public.is_staff();
drop table if exists public.group_members;
drop table if exists public.groups;
drop table if exists public.profiles;
