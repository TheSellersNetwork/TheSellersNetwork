-- Reverses 20260925000300_categories_tags.sql
drop table if exists public.tags;
drop function if exists public.category_visible(uuid);
drop trigger if exists categories_one_level on public.categories;
drop function if exists public.categories_enforce_one_level();
drop table if exists public.categories;
