-- Polls in topics, anonymous posting in sensitive forums, web push subscriptions.
-- Down: supabase/migrations/down/20260928001800_polls_anonymous_push.sql

-- Polls ----------------------------------------------------------------------
-- One poll per topic, added by the topic's author when the topic is created.
-- Votes are private: members see their own vote, everyone sees the totals.

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references public.topics (id) on delete cascade,
  question text not null,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  constraint polls_question_length check (char_length(question) between 3 and 200)
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  position smallint not null,
  label text not null,
  constraint poll_options_label_length check (char_length(label) between 1 and 80),
  constraint poll_options_position_range check (position between 0 and 7),
  unique (poll_id, position)
);

create table public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index poll_votes_option_idx on public.poll_votes (option_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy polls_select on public.polls for select using (public.topic_visible(topic_id));
create policy polls_insert on public.polls
  for insert to authenticated
  with check (exists (select 1 from public.topics t where t.id = topic_id and t.author_id = auth.uid()));
create policy polls_staff on public.polls
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy poll_options_select on public.poll_options
  for select using (exists (select 1 from public.polls p where p.id = poll_id and public.topic_visible(p.topic_id)));
create policy poll_options_insert on public.poll_options
  for insert to authenticated
  with check (exists (
    select 1 from public.polls p join public.topics t on t.id = p.topic_id
    where p.id = poll_id and t.author_id = auth.uid()
  ));
create policy poll_options_staff on public.poll_options
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- A vote must name an option of the same poll, on an open poll, in a topic the
-- member can see and that is not locked.
create or replace function public.poll_open(p_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.polls p join public.topics t on t.id = p.topic_id
    where p.id = p_poll_id
      and (p.closes_at is null or p.closes_at > now())
      and not t.is_locked
      and t.deleted_at is null
      and public.topic_visible(t.id)
  );
$$;

create policy poll_votes_select_own on public.poll_votes
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy poll_votes_own on public.poll_votes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.poll_open(poll_id)
    and exists (select 1 from public.poll_options o where o.id = option_id and o.poll_id = poll_votes.poll_id)
  );

grant select on public.polls, public.poll_options to anon;
grant select, insert on public.polls, public.poll_options to authenticated;
grant update, delete on public.polls, public.poll_options to authenticated;
grant select, insert, update, delete on public.poll_votes to authenticated;
grant all on public.polls, public.poll_options, public.poll_votes to service_role;

-- Totals per option, readable by anyone who can see the topic.
create or replace function public.poll_results(p_poll_id uuid)
returns table (option_id uuid, votes integer)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, count(v.user_id)::int
  from public.poll_options o
  join public.polls p on p.id = o.poll_id
  left join public.poll_votes v on v.option_id = o.id
  where o.poll_id = p_poll_id and public.topic_visible(p.topic_id)
  group by o.id;
$$;

-- Anonymous posting ----------------------------------------------------------
-- Anonymous posts are written by the server as a shared "Anonymous member"
-- account, so the public API never carries the real author. Who actually
-- wrote each one is kept in anonymous_authors, readable by staff and by the
-- author only.

create table public.site_accounts (
  key text primary key,
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  constraint site_accounts_key_valid check (key in ('anonymous'))
);

alter table public.site_accounts enable row level security;
create policy site_accounts_select on public.site_accounts for select using (true);
grant select on public.site_accounts to anon, authenticated;
grant all on public.site_accounts to service_role;

alter table public.categories add column allow_anonymous boolean not null default false;
alter table public.topics add column is_anonymous boolean not null default false;
alter table public.posts add column is_anonymous boolean not null default false;

create table public.anonymous_authors (
  post_id uuid primary key references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index anonymous_authors_user_idx on public.anonymous_authors (user_id);

alter table public.anonymous_authors enable row level security;
create policy anonymous_authors_select on public.anonymous_authors
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
grant select on public.anonymous_authors to authenticated;
grant all on public.anonymous_authors to service_role;

-- Only the server (service role) may mark something anonymous.
create or replace function public.protect_is_anonymous()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.is_anonymous = false;
    else
      new.is_anonymous = old.is_anonymous;
    end if;
  end if;
  return new;
end;
$$;

create trigger topics_protect_is_anonymous
  before insert or update on public.topics
  for each row execute function public.protect_is_anonymous();

create trigger posts_protect_is_anonymous
  before insert or update on public.posts
  for each row execute function public.protect_is_anonymous();

-- The shared account never appears among top answerers.
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
    and not exists (select 1 from public.site_accounts a where a.profile_id = p.id)
  group by p.id
  order by solutions desc, p.likes_received desc
  limit p_limit;
$$;

-- Web push -------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_https check (endpoint like 'https://%')
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

grant execute on all functions in schema public to anon, authenticated, service_role;
