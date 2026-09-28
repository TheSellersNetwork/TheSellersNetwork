-- Reverses 20260928001900_security_hardening.sql
alter table public.email_subscribers drop column if exists consent_text;
alter table public.profiles drop column if exists age_confirmed_at;
alter table public.profiles drop column if exists terms_accepted_at;
delete from public.site_accounts where key = 'deleted';
alter table public.site_accounts drop constraint site_accounts_key_valid;
alter table public.site_accounts add constraint site_accounts_key_valid check (key in ('anonymous'));
drop table if exists public.contact_messages;
alter table public.push_subscriptions drop constraint if exists push_subscriptions_endpoint_host;
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_https check (endpoint like 'https://%') not valid;
alter table public.flags drop constraint flags_reason_valid;
alter table public.flags add constraint flags_reason_valid
  check (reason in ('spam', 'selling', 'off_topic', 'abuse', 'policy_evasion', 'other')) not valid;
alter table public.profiles drop constraint if exists profiles_avatar_url_storage;

drop trigger if exists topics_check_solution on public.topics;
drop function if exists public.topics_check_solution();
drop trigger if exists posts_check_member_edit on public.posts;
drop function if exists public.posts_check_member_edit();
drop trigger if exists posts_protect_insert on public.posts;
drop function if exists public.posts_protect_insert();
drop trigger if exists topics_protect_insert on public.topics;
drop function if exists public.topics_protect_insert();
drop trigger if exists posts_strip_member_html on public.posts;
drop function if exists public.posts_strip_member_html();

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated with check (user_id = auth.uid() and not public.is_suspended_now(auth.uid()));
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select using (true);
drop policy if exists topic_subscriptions_own on public.topic_subscriptions;
create policy topic_subscriptions_own on public.topic_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists post_revisions_select on public.post_revisions;
create policy post_revisions_select on public.post_revisions
  for select to authenticated using (
    public.can_moderate_lightly()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );
create policy user_stats_daily_write_own on public.user_stats_daily
  for insert to authenticated with check (user_id = auth.uid());
create policy user_stats_daily_update_own on public.user_stats_daily
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

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
    -- Only TL3 and above may move or rename someone else's topic.
    if old.author_id <> auth.uid() and not public.can_moderate_lightly() then
      new.title = old.title;
      new.slug = old.slug;
      new.category_id = old.category_id;
      new.is_solved = old.is_solved;
      new.solution_post_id = old.solution_post_id;
    end if;
  end if;
  return new;
end;
$$;

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
  end if;
  return new;
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
    return public.category_visible(v_topic.category_id);
  end if;

  if v_topic.is_locked and not public.is_staff() then
    return false;
  end if;

  return public.can_post(v_topic.category_id, false);
end;
$$;

create or replace function public.can_flag()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or public.current_trust_level() >= 1;
$$;

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

create or replace function public.increment_view_count(p_topic_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.topics set view_count = view_count + 1 where id = p_topic_id;
$$;

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

  -- Daily caps: 3 topics and 10 replies. The brief lifts all caps at TL2,
  -- so TL0 and TL1 are both capped.
  if v_profile.trust_level <= 1 then
    if p_is_topic then
      select count(*) into v_topics_today
        from public.topics
        where author_id = v_uid and created_at > now() - interval '24 hours';
      if v_topics_today >= 3 then
        return false;
      end if;
    else
      select count(*) into v_replies_today
        from public.posts
        where author_id = v_uid and post_number > 1 and created_at > now() - interval '24 hours';
      if v_replies_today >= 10 then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;

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
  where t.category_id = p_category_id and t.deleted_at is null
  order by t.is_pinned desc, heat desc, t.created_at desc
  limit p_limit;
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

drop function if exists public.user_can_see_category(uuid, uuid);
grant execute on all functions in schema public to anon, authenticated, service_role;
