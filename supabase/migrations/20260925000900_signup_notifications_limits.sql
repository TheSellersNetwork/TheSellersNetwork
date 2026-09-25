-- Signup trigger, notification triggers, rate limits, reading stats and trust levels.
-- Down: supabase/migrations/down/20260925000900_signup_notifications_limits.sql

-- Notification preferences. The bell always fills; these govern email only.
alter table public.profiles
  add column email_on_reply boolean not null default true,
  add column email_on_mention boolean not null default true,
  add column email_digest boolean not null default true;

-- Profile row for every new auth user. The signup form passes username and
-- display_name in user metadata; if the username is missing or taken a safe
-- one is generated and the onboarding flow asks the member to pick.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_base text;
  v_display text;
  v_attempt integer := 0;
begin
  v_base := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if char_length(v_base) < 3 then
    v_base := 'member';
  end if;
  v_base := left(v_base, 24);
  v_username := v_base;

  while exists (select 1 from public.profiles where username = v_username) loop
    v_attempt := v_attempt + 1;
    v_username := v_base || '_' || substr(md5(random()::text), 1, 4);
    if v_attempt > 20 then
      v_username := 'member_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    end if;
  end loop;

  v_display := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, username, display_name)
    values (new.id, v_username, v_display);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fixed-window rate limits keyed by whatever the caller chooses
-- (user id plus action, or IP plus action). Returns false when the limit is hit.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := to_timestamp(
    floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window)
  );
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
    values (p_key, v_window_start, 1)
    on conflict (key, window_start) do update set count = public.rate_limits.count + 1
    returning count into v_count;

  -- Opportunistic cleanup so the table never grows without bound.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

-- Topic views are counted without needing update rights on topics.
create or replace function public.increment_view_count(p_topic_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.topics set view_count = view_count + 1 where id = p_topic_id;
$$;

-- Reading stats for the trust cron. Called by the app as the member reads.
create or replace function public.record_activity(
  p_topics_read integer default 0,
  p_posts_read integer default 0,
  p_time_read_secs integer default 0,
  p_likes_given integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.user_stats_daily (user_id, day, topics_read, posts_read, time_read_secs, likes_given)
    values (auth.uid(), current_date, p_topics_read, p_posts_read, p_time_read_secs, p_likes_given)
    on conflict (user_id, day) do update set
      topics_read = public.user_stats_daily.topics_read + excluded.topics_read,
      posts_read = public.user_stats_daily.posts_read + excluded.posts_read,
      time_read_secs = public.user_stats_daily.time_read_secs + excluded.time_read_secs,
      likes_given = public.user_stats_daily.likes_given + excluded.likes_given;

  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;

-- Subscriptions and notifications --------------------------------------

-- Authors watch their own topics and the topics they reply to.
create or replace function public.auto_subscribe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Shared by topics (use id) and posts (use topic_id); to_jsonb avoids a
  -- field reference that would not exist on one of the two row types.
  v_topic_id uuid := coalesce((to_jsonb(new) ->> 'topic_id')::uuid, (to_jsonb(new) ->> 'id')::uuid);
begin
  insert into public.topic_subscriptions (user_id, topic_id, level)
    values (new.author_id, v_topic_id, 'watching')
    on conflict do nothing;
  return null;
end;
$$;

create trigger topics_auto_subscribe
  after insert on public.topics
  for each row execute function public.auto_subscribe();

create trigger posts_auto_subscribe
  after insert on public.posts
  for each row execute function public.auto_subscribe();

-- New reply: notify everyone watching the topic. Mentions: notify the named
-- members, once each, and never the author. Mentions inside quotes are
-- stripped so quoting a reply does not re-notify its author.
create or replace function public.posts_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic public.topics%rowtype;
  v_payload jsonb;
  v_mention record;
  v_body text;
begin
  if new.post_number = 1 then
    return null;
  end if;

  select * into v_topic from public.topics where id = new.topic_id;

  v_payload := jsonb_build_object(
    'topic_id', v_topic.id,
    'topic_slug', v_topic.slug,
    'topic_short_id', v_topic.short_id,
    'topic_title', v_topic.title,
    'post_id', new.id,
    'post_number', new.post_number,
    'actor_id', new.author_id
  );

  insert into public.notifications (user_id, type, payload)
    select s.user_id, 'reply', v_payload
    from public.topic_subscriptions s
    where s.topic_id = new.topic_id
      and s.level = 'watching'
      and s.user_id <> new.author_id;

  v_body := regexp_replace(new.body_md, '(^|\n)>[^\n]*', '', 'g');
  for v_mention in
    select distinct p.id
    from regexp_matches(v_body, '(?:^|[^a-z0-9_])@([a-z0-9][a-z0-9_]{2,29})', 'gi') m
    join public.profiles p on p.username = lower(m[1])
    where p.id <> new.author_id
  loop
    if not exists (
      select 1 from public.notifications n
      where n.user_id = v_mention.id and n.type = 'reply' and n.payload ->> 'post_id' = new.id::text
    ) then
      insert into public.notifications (user_id, type, payload)
        values (v_mention.id, 'mention', v_payload);
    end if;
  end loop;

  return null;
end;
$$;

create trigger posts_notify
  after insert on public.posts
  for each row execute function public.posts_notify();

-- Solution marked: tell the author of the accepted post.
create or replace function public.topics_notify_solution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  if new.solution_post_id is not null and new.solution_post_id is distinct from old.solution_post_id then
    select author_id into v_author from public.posts where id = new.solution_post_id;
    if v_author is not null and v_author <> new.author_id then
      insert into public.notifications (user_id, type, payload)
        values (v_author, 'solution', jsonb_build_object(
          'topic_id', new.id,
          'topic_slug', new.slug,
          'topic_short_id', new.short_id,
          'topic_title', new.title,
          'post_id', new.solution_post_id,
          'actor_id', auth.uid()
        ));
    end if;
  end if;
  return null;
end;
$$;

create trigger topics_notify_solution
  after update of solution_post_id on public.topics
  for each row execute function public.topics_notify_solution();

-- Trust levels -----------------------------------------------------------

-- Promotes TL0 to TL1 and TL1 to TL2 from the brief's thresholds, and refreshes
-- days_visited. TL3 and TL4 are Phase B. Run nightly by pg_cron.
create or replace function public.recompute_trust_levels()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted integer := 0;
  v_rows integer := 0;
begin
  update public.profiles p
    set days_visited = s.days
    from (
      select user_id, count(distinct day) as days from public.user_stats_daily group by user_id
    ) s
    where s.user_id = p.id and p.days_visited <> s.days;

  -- TL0 to TL1: read 5 topics, 30 posts, 10 minutes on site.
  with stats as (
    select user_id,
           sum(topics_read) as topics_read,
           sum(posts_read) as posts_read,
           sum(time_read_secs) as secs
    from public.user_stats_daily
    group by user_id
  )
  update public.profiles p
    set trust_level = 1
    from stats s
    where s.user_id = p.id
      and p.trust_level = 0
      and not p.is_staff
      and s.topics_read >= 5
      and s.posts_read >= 30
      and s.secs >= 600;
  get diagnostics v_promoted = row_count;

  -- TL1 to TL2: 15 days visited, 20 likes received, 1 like given, 3 replies.
  update public.profiles p
    set trust_level = 2
    where p.trust_level = 1
      and not p.is_staff
      and p.days_visited >= 15
      and p.likes_received >= 20
      and (select coalesce(sum(likes_given), 0) from public.user_stats_daily d where d.user_id = p.id) >= 1
      and (select count(*) from public.posts x where x.author_id = p.id and x.post_number > 1 and not x.is_deleted) >= 3;
  get diagnostics v_rows = row_count;
  v_promoted := v_promoted + v_rows;

  return v_promoted;
end;
$$;

-- Policies for the new pieces. rate_limits has no policies: only the
-- security definer function touches it.
grant execute on all functions in schema public to anon, authenticated, service_role;
