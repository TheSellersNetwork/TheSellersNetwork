-- Reverses 20260925000800_permissions_rls.sql
-- Drops every policy in public, the column-protection triggers and the
-- permission functions, then disables RLS. Grants are left in place because
-- Supabase applies them by default anyway.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end;
$$;

drop trigger if exists posts_protect_columns on public.posts;
drop function if exists public.posts_protect_columns();
drop trigger if exists topics_protect_columns on public.topics;
drop function if exists public.topics_protect_columns();
drop trigger if exists profiles_protect_columns on public.profiles;
drop function if exists public.profiles_protect_columns();

drop function if exists public.can_moderate_lightly();
drop function if exists public.can_flag();
drop function if exists public.can_reply(uuid);
drop function if exists public.can_post(uuid, boolean);

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I disable row level security', r.tablename);
  end loop;
end;
$$;
