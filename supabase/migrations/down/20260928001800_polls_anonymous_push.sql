-- Reverses 20260928001800_polls_anonymous_push.sql
drop table if exists public.push_subscriptions;

-- Restore top_answerers as it was in 20260925001100.
create or replace function public.top_answerers(p_days integer default 30, p_limit integer default 5)
returns table (id uuid, username text, display_name text, avatar_url text, trust_level smallint, is_staff boolean, solutions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.trust_level, p.is_staff, count(*) as solutions
  from public.topics t
  join public.posts s on s.id = t.solution_post_id
  join public.profiles p on p.id = s.author_id
  where t.is_solved
    and t.deleted_at is null
    and t.updated_at > now() - make_interval(days => p_days)
    and s.author_id <> t.author_id
  group by p.id
  order by solutions desc, p.likes_received desc
  limit p_limit;
$$;

drop trigger if exists posts_protect_is_anonymous on public.posts;
drop trigger if exists topics_protect_is_anonymous on public.topics;
drop function if exists public.protect_is_anonymous();
drop table if exists public.anonymous_authors;
alter table public.posts drop column if exists is_anonymous;
alter table public.topics drop column if exists is_anonymous;
alter table public.categories drop column if exists allow_anonymous;
drop table if exists public.site_accounts;

drop function if exists public.poll_results(uuid);
drop table if exists public.poll_votes;
drop function if exists public.poll_open(uuid);
drop table if exists public.poll_options;
drop table if exists public.polls;
