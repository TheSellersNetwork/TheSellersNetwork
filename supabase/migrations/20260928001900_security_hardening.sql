-- Security hardening after the September 2026 review, plus the tables the
-- legal pages need (contact messages, the deleted-member account).
-- Down: supabase/migrations/down/20260928001900_security_hardening.sql
--
-- The anon key is public, so every rule here assumes a member calling the
-- REST API directly with their own session, not through the app.

-- 1. Post HTML is never written by members --------------------------------
-- The app renders from body_md and sanitises. A member-supplied body_html
-- could carry script, so it is cleared on every member write.
create or replace function public.posts_strip_member_html()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.body_html = null;
  end if;
  return new;
end;
$$;

create trigger posts_strip_member_html
  before insert or update on public.posts
  for each row execute function public.posts_strip_member_html();

-- 2. Server-owned columns are forced on insert too ------------------------
create or replace function public.topics_protect_insert()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.is_pinned = false;
    new.is_locked = false;
    new.is_unlisted = false;
    new.deleted_at = null;
    new.view_count = 0;
    new.reply_count = 0;
    new.like_count = 0;
    new.is_solved = false;
    new.solution_post_id = null;
    new.created_at = now();
    new.last_post_at = now();
    new.last_poster_id = new.author_id;
    -- More than ten new topics an hour from one member is never normal.
    if (select count(*) from public.topics where author_id = new.author_id and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'posting_too_fast' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger topics_protect_insert
  before insert on public.topics
  for each row execute function public.topics_protect_insert();

create or replace function public.posts_protect_insert()
returns trigger
language plpgsql
as $$
declare
  v_trust smallint := public.current_trust_level();
  v_mentions integer;
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.like_count = 0;
    new.created_at = now();
    new.is_deleted = false;
    new.deleted_by = null;
    new.deleted_at = null;
    new.is_hidden = false;
    new.hidden_at = null;
    new.hidden_reason = null;
    new.edited_at = null;
    new.edit_count = 0;
    if (select count(*) from public.posts where author_id = new.author_id and created_at > now() - interval '1 hour') >= 40 then
      raise exception 'posting_too_fast' using errcode = 'check_violation';
    end if;
    -- The same caps the app applies, so a direct API call cannot skip them.
    if v_trust < 1 then
      if new.body_md ~* '(^|[^!])\[[^]]*\]\(https?://|(^|\s)(https?://|www\.)' then
        raise exception 'links_not_allowed' using errcode = 'check_violation';
      end if;
      select count(distinct lower(m[1])) into v_mentions
        from regexp_matches(new.body_md, '(?:^|[^a-z0-9_])@([a-z0-9][a-z0-9_]{2,29})', 'gi') m;
      if v_mentions > 2 then
        raise exception 'too_many_mentions' using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_protect_insert
  before insert on public.posts
  for each row execute function public.posts_protect_insert();

-- Edits by new members cannot add links either.
create or replace function public.posts_check_member_edit()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff()
     and new.body_md is distinct from old.body_md
     and public.current_trust_level() < 1
     and new.body_md ~* '(^|[^!])\[[^]]*\]\(https?://|(^|\s)(https?://|www\.)' then
    raise exception 'links_not_allowed' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger posts_check_member_edit
  before update on public.posts
  for each row execute function public.posts_check_member_edit();

-- 3. Topics: a member cannot move their topic somewhere they could not post,
--    and a solution must be a reply in the same topic.
create or replace function public.topics_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.is_pinned = old.is_pinned;
    new.is_locked = old.is_locked;
    new.is_unlisted = old.is_unlisted;
    new.deleted_at = old.deleted_at;
    new.view_count = old.view_count;
    new.reply_count = old.reply_count;
    new.like_count = old.like_count;
    new.last_post_at = old.last_post_at;
    new.last_poster_id = old.last_poster_id;
    new.author_id = old.author_id;
    new.short_id = old.short_id;
    new.created_at = old.created_at;
    new.is_anonymous = old.is_anonymous;
    -- Only TL3 and above may move or rename someone else's topic.
    if old.author_id <> auth.uid() and not public.can_moderate_lightly() then
      new.title = old.title;
      new.slug = old.slug;
      new.category_id = old.category_id;
      new.is_solved = old.is_solved;
      new.solution_post_id = old.solution_post_id;
    end if;
    if new.category_id is distinct from old.category_id and not public.can_post(new.category_id, true) then
      raise exception 'category_not_allowed' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.topics_check_solution()
returns trigger
language plpgsql
as $$
begin
  if new.solution_post_id is not null and new.solution_post_id is distinct from old.solution_post_id then
    if not exists (
      select 1 from public.posts p
      where p.id = new.solution_post_id and p.topic_id = new.id and p.post_number > 1 and not p.is_deleted
    ) then
      raise exception 'solution_not_in_topic' using errcode = 'check_violation';
    end if;
  end if;
  new.is_solved = new.solution_post_id is not null;
  return new;
end;
$$;

create trigger topics_check_solution
  before update of solution_post_id on public.topics
  for each row execute function public.topics_check_solution();

-- 4. Profiles: reputation and presence are server-owned. Onboarding may only
--    stamp "now", once.
create or replace function public.profiles_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.trust_level = old.trust_level;
    new.is_staff = old.is_staff;
    new.is_suspended = old.is_suspended;
    new.suspended_until = old.suspended_until;
    new.suspension_reason = old.suspension_reason;
    new.post_count = old.post_count;
    new.likes_received = old.likes_received;
    new.days_visited = old.days_visited;
    new.created_at = old.created_at;
    new.solution_count = old.solution_count;
    new.last_seen_at = old.last_seen_at;
    new.onboarded_at = case when old.onboarded_at is null and new.onboarded_at is not null then now() else old.onboarded_at end;
    new.rules_accepted_at = case when new.rules_accepted_at is not null and new.rules_accepted_at is distinct from old.rules_accepted_at then now() else old.rules_accepted_at end;
  end if;
  return new;
end;
$$;

-- Avatars must come from our own storage, so they cannot be tracking pixels.
alter table public.profiles add constraint profiles_avatar_url_storage
  check (avatar_url is null or avatar_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/') not valid;

-- 5. Trust levels cannot be farmed ----------------------------------------
drop policy if exists user_stats_daily_write_own on public.user_stats_daily;
drop policy if exists user_stats_daily_update_own on public.user_stats_daily;

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

  -- Each call reports a few minutes of reading at most; each day has a ceiling.
  insert into public.user_stats_daily (user_id, day, topics_read, posts_read, time_read_secs, likes_given)
    values (
      auth.uid(), current_date,
      least(greatest(coalesce(p_topics_read, 0), 0), 20),
      least(greatest(coalesce(p_posts_read, 0), 0), 200),
      least(greatest(coalesce(p_time_read_secs, 0), 0), 600),
      least(greatest(coalesce(p_likes_given, 0), 0), 1)
    )
    on conflict (user_id, day) do update set
      topics_read = least(public.user_stats_daily.topics_read + excluded.topics_read, 200),
      posts_read = least(public.user_stats_daily.posts_read + excluded.posts_read, 2000),
      time_read_secs = least(public.user_stats_daily.time_read_secs + excluded.time_read_secs, 14400),
      likes_given = least(public.user_stats_daily.likes_given + excluded.likes_given, 100);

  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;

-- No liking your own posts.
drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- Likes are only visible where the post is.
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes
  for select using (exists (select 1 from public.posts p where p.id = post_id and public.topic_visible(p.topic_id)));

-- 6. Private categories stay private -------------------------------------
create or replace function public.user_can_see_category(p_user uuid, p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.categories c
    where c.id = p_category_id
      and (
        not c.is_private
        or exists (select 1 from public.profiles p where p.id = p_user and p.is_staff)
        or exists (
          select 1 from public.group_members gm
          where gm.group_id = c.allowed_group_id and gm.user_id = p_user
            and (gm.expires_at is null or gm.expires_at > now())
        )
      )
  );
$$;

drop policy if exists topic_subscriptions_own on public.topic_subscriptions;
create policy topic_subscriptions_own on public.topic_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.topic_visible(topic_id));

drop policy if exists post_revisions_select on public.post_revisions;
create policy post_revisions_select on public.post_revisions
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id and public.topic_visible(p.topic_id))
    and (
      public.can_moderate_lightly()
      or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    )
  );

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
    and public.category_visible(t.category_id)
    and t.last_post_at > coalesce(v.visited_at, now() - interval '7 days')
    and t.last_poster_id is distinct from auth.uid()
  group by t.category_id;
$$;

create or replace function public.deal_topics(p_category_id uuid, p_limit integer default 50)
returns table (topic_id uuid, heat numeric, valid_votes bigint, expired_votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.id,
    round(
      ((coalesce(v.valid, 0) * 2 + t.like_count + t.reply_count * 0.5 - coalesce(v.expired, 0) * 3)
        / power(1 + extract(epoch from now() - t.created_at) / 86400.0, 0.6)
      ) - case when t.expires_at is not null and t.expires_at < now() then 100 else 0 end,
      3
    ) as heat,
    coalesce(v.valid, 0), coalesce(v.expired, 0)
  from public.topics t
  left join (
    select topic_id,
      count(*) filter (where vote = 'valid') as valid,
      count(*) filter (where vote = 'expired') as expired
    from public.deal_votes group by topic_id
  ) v on v.topic_id = t.id
  where t.category_id = p_category_id and t.deleted_at is null and public.category_visible(p_category_id)
  order by t.is_pinned desc, heat desc, t.created_at desc
  limit least(p_limit, 200);
$$;

create or replace function public.top_answerers(p_days integer default 30, p_limit integer default 5)
returns table (id uuid, username text, display_name text, avatar_url text, trust_level smallint, is_staff boolean, solutions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.trust_level, p.is_staff, count(*) as solutions
  from public.topics t
  join public.categories c on c.id = t.category_id and not c.is_private
  join public.posts s on s.id = t.solution_post_id
  join public.profiles p on p.id = s.author_id
  where t.is_solved
    and t.deleted_at is null
    and t.updated_at > now() - make_interval(days => p_days)
    and s.author_id <> t.author_id
    and not exists (select 1 from public.site_accounts a where a.profile_id = p.id)
  group by p.id
  order by solutions desc, p.likes_received desc
  limit least(p_limit, 50);
$$;

-- Notifications only go to people who can see the topic, and a post can
-- mention at most a handful of people.
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
  v_limit integer;
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
      and s.user_id <> new.author_id
      and public.user_can_see_category(s.user_id, v_topic.category_id);

  select case when p.is_staff then 50 when p.trust_level >= 2 then 10 else 2 end
    into v_limit from public.profiles p where p.id = new.author_id;

  v_body := regexp_replace(new.body_md, '(^|\n)>[^\n]*', '', 'g');
  for v_mention in
    select distinct p.id
    from regexp_matches(v_body, '(?:^|[^a-z0-9_])@([a-z0-9][a-z0-9_]{2,29})', 'gi') m
    join public.profiles p on p.username = lower(m[1])
    where p.id <> new.author_id
      and public.user_can_see_category(p.id, v_topic.category_id)
    limit coalesce(v_limit, 2)
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

-- 7. Posting rules: anonymous posts count towards daily caps, and an empty
--    topic cannot be used to skip the reply rules.
create or replace function public.can_post(p_category_id uuid, p_is_topic boolean default true)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_category public.categories%rowtype;
  v_topics_today integer;
  v_replies_today integer;
begin
  if v_uid is null then
    return false;
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    return false;
  end if;

  if v_profile.is_staff then
    return true;
  end if;

  if public.is_suspended_now(v_uid) then
    return false;
  end if;

  select * into v_category from public.categories where id = p_category_id;
  if not found then
    return false;
  end if;

  if p_is_topic and not v_category.accepting_topics then
    return false;
  end if;

  if v_category.is_private
     and (v_category.allowed_group_id is null or not public.is_member_of_group(v_category.allowed_group_id)) then
    return false;
  end if;

  if v_profile.trust_level < v_category.min_trust_to_post then
    return false;
  end if;

  if v_category.min_account_age_hours > 0
     and v_profile.created_at > now() - make_interval(hours => v_category.min_account_age_hours) then
    return false;
  end if;

  -- Daily caps: 3 topics and 10 replies for TL0 and TL1, counting anonymous posts.
  if v_profile.trust_level <= 1 then
    if p_is_topic then
      select count(*) into v_topics_today
        from public.topics
        where author_id = v_uid and created_at > now() - interval '24 hours';
      select v_topics_today + count(*) into v_topics_today
        from public.anonymous_authors a join public.posts p on p.id = a.post_id
        where a.user_id = v_uid and p.post_number = 1 and a.created_at > now() - interval '24 hours';
      if v_topics_today >= 3 then
        return false;
      end if;
    else
      select count(*) into v_replies_today
        from public.posts
        where author_id = v_uid and post_number > 1 and created_at > now() - interval '24 hours';
      select v_replies_today + count(*) into v_replies_today
        from public.anonymous_authors a join public.posts p on p.id = a.post_id
        where a.user_id = v_uid and p.post_number > 1 and a.created_at > now() - interval '24 hours';
      if v_replies_today >= 10 then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.can_reply(p_topic_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_topic public.topics%rowtype;
  v_post_count integer;
begin
  if v_uid is null then
    return false;
  end if;

  select * into v_topic from public.topics where id = p_topic_id;
  if not found or v_topic.deleted_at is not null then
    return public.is_staff();
  end if;

  select count(*) into v_post_count from public.posts where topic_id = p_topic_id;
  if v_post_count = 0 and v_topic.author_id = v_uid then
    return public.category_visible(v_topic.category_id) and not public.is_suspended_now(v_uid);
  end if;

  if v_topic.is_locked and not public.is_staff() then
    return false;
  end if;

  return public.can_post(v_topic.category_id, false);
end;
$$;

-- 8. Reporting: anyone signed in can report, with reasons for illegal and
--    legal complaints. Only established members' flags count towards hiding.
alter table public.flags drop constraint flags_reason_valid;
alter table public.flags add constraint flags_reason_valid
  check (reason in ('spam', 'selling', 'off_topic', 'abuse', 'policy_evasion', 'other', 'illegal', 'harassment', 'defamation', 'copyright', 'child_safety', 'scam'));

create or replace function public.can_flag()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and not public.is_suspended_now(auth.uid());
$$;

-- 9. Functions the public must not call ----------------------------------
create or replace function public.increment_view_count(p_topic_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.topics set view_count = view_count + 1 where id = p_topic_id and public.topic_visible(p_topic_id);
$$;

-- Push endpoints must belong to a real browser push service.
alter table public.push_subscriptions drop constraint push_subscriptions_endpoint_https;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_host
  check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)/');

-- 10. Contact form, reports and legal notices ------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  name text,
  email text,
  url text,
  message text not null,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open',
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  staff_note text,
  created_at timestamptz not null default now(),
  constraint contact_messages_kind_valid check (kind in ('general', 'report', 'data', 'complaint', 'appeal', 'defamation', 'copyright', 'accessibility', 'partnership')),
  constraint contact_messages_status_valid check (status in ('open', 'in_progress', 'closed')),
  constraint contact_messages_message_length check (char_length(message) between 10 and 5000),
  constraint contact_messages_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index contact_messages_open_idx on public.contact_messages (created_at desc) where status <> 'closed';

alter table public.contact_messages enable row level security;
-- Written by the server after a bot check; staff read and update.
create policy contact_messages_staff on public.contact_messages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
grant select, update on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;

-- The shared "Deleted member" account that posts move to when a member deletes their account.
alter table public.site_accounts drop constraint site_accounts_key_valid;
alter table public.site_accounts add constraint site_accounts_key_valid check (key in ('anonymous', 'deleted'));

-- Record of consent at signup.
alter table public.profiles add column terms_accepted_at timestamptz;
alter table public.profiles add column age_confirmed_at timestamptz;

-- Newsletter consent record.
alter table public.email_subscribers add column consent_text text;

-- Grants. Functions are no longer granted wholesale; these must stay server-only.
grant execute on all functions in schema public to anon, authenticated, service_role;
revoke execute on function public.check_rate_limit(text, integer, interval) from public, anon, authenticated;
revoke execute on function public.recompute_trust_levels() from public, anon, authenticated;
revoke execute on function public.refresh_topic_counters(uuid) from public, anon, authenticated;
revoke execute on function public.record_placement_event(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.user_can_see_category(uuid, uuid) from public, anon, authenticated;
