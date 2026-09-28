-- Reverses 20260928002200_pickups.sql
drop function if exists public.bolo_brands(integer, integer);
drop trigger if exists pickup_likes_count on public.pickup_likes;
drop function if exists public.pickup_likes_count();
drop table if exists public.pickup_likes;
drop trigger if exists pickups_protect on public.pickups;
drop function if exists public.pickups_protect();
drop table if exists public.pickups;
