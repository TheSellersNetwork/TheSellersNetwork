-- Reverses 20260930000300_saved_calculations.sql
drop trigger if exists saved_calculations_protect on public.saved_calculations;
drop function if exists public.saved_calculations_protect();
drop table if exists public.saved_calculations;
