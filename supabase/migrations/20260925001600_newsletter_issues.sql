-- Sent newsletter issues, readable on the site and used as proof under the signup box.
-- Down: supabase/migrations/down/20260925001600_newsletter_issues.sql

create table public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  subject text not null,
  preview_text text,
  body_md text not null,
  body_html text,
  sent_at timestamptz,
  -- Filled in by the sending job from the real send count.
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_issues_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$')
);

create index newsletter_issues_sent_idx on public.newsletter_issues (sent_at desc) where sent_at is not null;

create trigger newsletter_issues_set_updated_at
  before update on public.newsletter_issues
  for each row execute function public.set_updated_at();

alter table public.newsletter_issues enable row level security;

create policy newsletter_issues_select on public.newsletter_issues
  for select using (sent_at is not null or public.is_staff());
create policy newsletter_issues_staff_write on public.newsletter_issues
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

grant select on public.newsletter_issues to anon;
grant select, insert, update, delete on public.newsletter_issues to authenticated;
grant all on public.newsletter_issues to service_role;

-- Members active in the last N days with the platforms they picked, for the home page strip.
create or replace function public.recent_members(p_days integer default 7, p_limit integer default 12)
returns table (id uuid, username text, display_name text, avatar_url text, trust_level smallint, is_staff boolean, solution_count integer, marketplaces text[], last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.trust_level, p.is_staff, p.solution_count, p.marketplaces, p.last_seen_at
  from public.profiles p
  where p.onboarded_at is not null
    and not p.is_suspended
    and p.last_seen_at > now() - make_interval(days => p_days)
  order by p.last_seen_at desc
  limit p_limit;
$$;

grant execute on all functions in schema public to anon, authenticated, service_role;
