-- Profiles, groups and the identity helpers every policy relies on.
-- Down: supabase/migrations/down/20260925000200_profiles_groups.sql

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Required. Drives @mentions and /community/u/[username]. Lowercase only.
  username text not null,
  -- Optional. A real name, a shop name, or left empty to show the username.
  display_name text,
  avatar_url text,
  bio text,
  marketplaces text[] not null default '{}',
  trust_level smallint not null default 0,
  post_count integer not null default 0,
  likes_received integer not null default 0,
  days_visited integer not null default 0,
  last_seen_at timestamptz,
  is_staff boolean not null default false,
  is_suspended boolean not null default false,
  suspended_until timestamptz,
  suspension_reason text,
  rules_accepted_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9_]{2,29}$'),
  constraint profiles_display_name_length
    check (display_name is null or char_length(display_name) between 1 and 60),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 500),
  constraint profiles_trust_level_range check (trust_level between 0 and 4),
  constraint profiles_marketplaces_valid check (
    marketplaces <@ array['ebay', 'amazon', 'vinted', 'etsy', 'depop', 'facebook', 'own_website', 'other']::text[]
  )
);

create unique index profiles_username_key on public.profiles (username);
create index profiles_trust_level_idx on public.profiles (trust_level);
create index profiles_last_seen_at_idx on public.profiles (last_seen_at desc);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Groups gate private categories. is_paid groups are filled by the Stripe webhook.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  constraint groups_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$')
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- Identity helpers. All security definer so policies can read profiles without
-- recursing through the profiles policies themselves.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_staff from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Trust level of the caller, or -1 for a signed-out visitor.
create or replace function public.current_trust_level()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.trust_level from public.profiles p where p.id = auth.uid()),
    -1
  )::smallint;
$$;

create or replace function public.is_suspended_now(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_suspended and (p.suspended_until is null or p.suspended_until > now())
      from public.profiles p
      where p.id = p_user_id
    ),
    false
  );
$$;

create or replace function public.is_member_of_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and (gm.expires_at is null or gm.expires_at > now())
  );
$$;
