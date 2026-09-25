-- Presence, per-category visit tracking (for unread counts) and front page stats.
-- Down: supabase/migrations/down/20260925001200_presence_visits_stats.sql

-- When the member last opened the community front page, for "new" pills.
alter table public.profiles add column home_visited_at timestamptz;

-- Last time a member opened each category. Unread = topics with activity since.
create table public.category_visits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  visited_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.category_visits enable row level security;

create policy category_visits_own on public.category_visits
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.category_visits to authenticated;
grant all on public.category_visits to service_role;

-- Lightweight heartbeat from the browser. Only touches last_seen_at.
create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

-- Members active in the last few minutes, most recent first.
create or replace function public.online_members(p_minutes integer default 5, p_limit integer default 12)
returns table (id uuid, username text, display_name text, avatar_url text, trust_level smallint, is_staff boolean, solution_count integer, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.trust_level, p.is_staff, p.solution_count, p.last_seen_at
  from public.profiles p
  where p.last_seen_at > now() - make_interval(mins => p_minutes)
    and not p.is_suspended
  order by p.last_seen_at desc
  limit p_limit;
$$;

-- Front page numbers for the last seven days.
create or replace function public.community_stats()
returns table (topics_week bigint, replies_week bigint, solved_week bigint, online_now bigint, members bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.topics where created_at > now() - interval '7 days' and deleted_at is null),
    (select count(*) from public.posts where created_at > now() - interval '7 days' and post_number > 1 and not is_deleted),
    (select count(*) from public.topics where is_solved and updated_at > now() - interval '7 days' and deleted_at is null),
    (select count(*) from public.profiles where last_seen_at > now() - interval '1 hour'),
    (select count(*) from public.profiles where onboarded_at is not null);
$$;

-- Unread topic counts per category for the caller: topics with activity
-- since the member last opened that category (or all, if never opened).
create or replace function public.category_unread_counts()
returns table (category_id uuid, unread bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.category_id, count(*)
  from public.topics t
  left join public.category_visits v on v.category_id = t.category_id and v.user_id = auth.uid()
  where auth.uid() is not null
    and t.deleted_at is null
    and t.last_post_at > coalesce(v.visited_at, now() - interval '7 days')
    and t.last_poster_id is distinct from auth.uid()
  group by t.category_id;
$$;

grant execute on all functions in schema public to anon, authenticated, service_role;
