-- Helpers shared by every later migration.
-- Down: supabase/migrations/down/20260925000100_helpers.sql

-- Keeps updated_at current on any table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Raises on any update or delete. Used for the immutable moderation log.
create or replace function public.prevent_change()
returns trigger
language plpgsql
as $$
begin
  raise exception '% rows cannot be % (immutable table)', tg_table_name, lower(tg_op)
    using errcode = 'restrict_violation';
end;
$$;

-- URL-safe slug from free text. Accents are stripped by the app before this runs.
create or replace function public.slugify(input text)
returns text
language sql
immutable
strict
as $$
  select left(
    trim(both '-' from regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g')),
    80
  );
$$;

-- Eight hex characters, enough to keep topic URLs stable when titles change.
create or replace function public.generate_short_id()
returns text
language sql
volatile
as $$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 8);
$$;
