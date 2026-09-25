-- Categories (one level of subcategories) and tags.
-- Down: supabase/migrations/down/20260925000300_categories_tags.sql

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- A token name from src/styles/tokens.css (ebay, amazon, general...) rather than a hex value.
  colour text not null default 'general',
  icon text,
  position integer not null default 0,
  parent_id uuid references public.categories (id) on delete restrict,
  min_trust_to_post smallint not null default 0,
  -- Accounts younger than this cannot post here. Used by Wins and Sourcing (24 hours).
  min_account_age_hours integer not null default 0,
  is_private boolean not null default false,
  allowed_group_id uuid references public.groups (id) on delete set null,
  topic_count integer not null default 0,
  post_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  constraint categories_min_trust_range check (min_trust_to_post between 0 and 4),
  constraint categories_private_needs_group check (not is_private or allowed_group_id is not null)
);

create index categories_parent_position_idx on public.categories (parent_id, position);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- One level of nesting only: a subcategory cannot itself be a parent.
create or replace function public.categories_enforce_one_level()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a category cannot be its own parent' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.categories where id = new.parent_id and parent_id is not null) then
      raise exception 'categories may only be nested one level deep' using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.categories where parent_id = new.id) then
      raise exception 'a category with subcategories cannot be moved under another' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_one_level
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_enforce_one_level();

-- Can the caller see this category. Public ones are visible to everyone,
-- private ones to staff and members of the allowed group.
create or replace function public.category_visible(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and (
        not c.is_private
        or public.is_staff()
        or (c.allowed_group_id is not null and public.is_member_of_group(c.allowed_group_id))
      )
  );
$$;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  topic_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tags_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$')
);
