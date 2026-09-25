-- Posting rules and row-level security for every table.
-- Down: supabase/migrations/down/20260925000800_permissions_rls.sql
--
-- Principles
--   Anyone can read public forum content. Only authenticated members write.
--   Trust caps live in can_post() so the app and the database agree.
--   Staff bypass everything through is_staff(). Private categories check group membership.
--   Email and notification tables are written by the server with the service role.

-- Can the caller start a topic in this category.
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

-- Can the caller add a post to this topic. The first post of a topic is the
-- topic author's opening post and was already gated by can_post at topic insert.
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

-- TL1 and above can flag. TL3 and above and staff can moderate lightly.
create or replace function public.can_flag()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or public.current_trust_level() >= 1;
$$;

create or replace function public.can_moderate_lightly()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() or public.current_trust_level() >= 3;
$$;

-- Row-level security ------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.topic_subscriptions enable row level security;
alter table public.flags enable row level security;
alter table public.post_revisions enable row level security;
alter table public.topic_tags enable row level security;
alter table public.notifications enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.moderation_log enable row level security;
alter table public.user_stats_daily enable row level security;
alter table public.blog_posts enable row level security;
alter table public.email_subscribers enable row level security;
alter table public.email_sequence_steps enable row level security;
alter table public.email_sends enable row level security;

-- profiles: public read, own edits, staff everything.
-- Trust level, staff flag and suspension are protected by a trigger below
-- because a policy cannot restrict individual columns.
--
-- The column-protection triggers only bite for requests arriving as the anon
-- or authenticated role. Counter and moderation updates made by the security
-- definer trigger functions run as the function owner and pass through.
create policy profiles_select on public.profiles
  for select using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());

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

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.profiles_protect_columns();

-- groups: anyone can see what groups exist; membership is private.
create policy groups_select on public.groups
  for select using (true);
create policy groups_staff_write on public.groups
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy group_members_select on public.group_members
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy group_members_staff_write on public.group_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- categories and tags
create policy categories_select on public.categories
  for select using (public.category_visible(id));
create policy categories_staff_write on public.categories
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy tags_select on public.tags
  for select using (true);
create policy tags_write on public.tags
  for all to authenticated using (public.can_moderate_lightly()) with check (public.can_moderate_lightly());

-- topics
create policy topics_select on public.topics
  for select using (
    (deleted_at is null or public.is_staff())
    and public.category_visible(category_id)
  );
create policy topics_insert on public.topics
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_post(category_id, true));
create policy topics_update on public.topics
  for update to authenticated
  using (
    public.is_staff()
    or public.can_moderate_lightly()
    or (author_id = auth.uid() and not is_locked and deleted_at is null)
  )
  with check (
    public.is_staff()
    or public.can_moderate_lightly()
    or author_id = auth.uid()
  );
create policy topics_delete_staff on public.topics
  for delete to authenticated using (public.is_staff());

-- Authors and TL3 may not pin, lock or unlist. Only staff (TL4 is staff-granted).
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

create trigger topics_protect_columns
  before update on public.topics
  for each row execute function public.topics_protect_columns();

-- posts
create policy posts_select on public.posts
  for select using (
    public.topic_visible(topic_id)
    and (
      (is_deleted = false and is_hidden = false)
      or author_id = auth.uid()
      or public.is_staff()
    )
  );
create policy posts_insert on public.posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.can_reply(topic_id));
create policy posts_update on public.posts
  for update to authenticated
  using (public.is_staff() or (author_id = auth.uid() and is_deleted = false))
  with check (public.is_staff() or author_id = auth.uid());
create policy posts_delete_staff on public.posts
  for delete to authenticated using (public.is_staff());

-- Authors may edit their body and soft-delete. Everything else is staff or system.
-- TL1 can edit for 24 hours, TL2 and above indefinitely.
create or replace function public.posts_protect_columns()
returns trigger
language plpgsql
as $$
declare
  v_trust smallint := public.current_trust_level();
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.author_id = old.author_id;
    new.topic_id = old.topic_id;
    new.post_number = old.post_number;
    new.like_count = old.like_count;
    new.is_hidden = old.is_hidden;
    new.hidden_at = old.hidden_at;
    new.hidden_reason = old.hidden_reason;
    new.created_at = old.created_at;
    if new.is_deleted and not old.is_deleted then
      new.deleted_by = auth.uid();
      new.deleted_at = now();
    elsif not new.is_deleted and old.is_deleted then
      -- Members cannot undelete.
      new.is_deleted = old.is_deleted;
      new.deleted_by = old.deleted_by;
      new.deleted_at = old.deleted_at;
    end if;
    if old.body_md is distinct from new.body_md then
      if v_trust < 1 then
        raise exception 'edit_not_allowed'
          using errcode = 'insufficient_privilege',
                hint = 'New members cannot edit posts yet.';
      end if;
      if v_trust = 1 and old.created_at < now() - interval '24 hours' then
        raise exception 'edit_window_closed'
          using errcode = 'insufficient_privilege',
                hint = 'Posts can be edited for 24 hours at this trust level.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_protect_columns
  before update on public.posts
  for each row execute function public.posts_protect_columns();

-- likes, bookmarks, subscriptions: own rows only. Likes are readable so
-- the thread can show who liked a post.
create policy likes_select on public.likes
  for select using (true);
create policy likes_insert_own on public.likes
  for insert to authenticated with check (user_id = auth.uid() and not public.is_suspended_now(auth.uid()));
create policy likes_delete_own on public.likes
  for delete to authenticated using (user_id = auth.uid());

create policy bookmarks_own on public.bookmarks
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy topic_subscriptions_own on public.topic_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- flags: reporters see their own, staff see all. TL1 and above may flag.
create policy flags_select on public.flags
  for select to authenticated using (reporter_id = auth.uid() or public.is_staff());
create policy flags_insert on public.flags
  for insert to authenticated with check (reporter_id = auth.uid() and public.can_flag());
create policy flags_update_staff on public.flags
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- post_revisions: the author, staff and TL3 can read history. Rows are
-- written by the revision trigger, which runs as definer.
create policy post_revisions_select on public.post_revisions
  for select to authenticated using (
    public.can_moderate_lightly()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- topic_tags: readable with the topic, editable by the author, TL3 and staff.
create policy topic_tags_select on public.topic_tags
  for select using (public.topic_visible(topic_id));
create policy topic_tags_write on public.topic_tags
  for all to authenticated
  using (
    public.can_moderate_lightly()
    or exists (select 1 from public.topics t where t.id = topic_id and t.author_id = auth.uid())
  )
  with check (
    public.can_moderate_lightly()
    or exists (select 1 from public.topics t where t.id = topic_id and t.author_id = auth.uid())
  );

-- notifications: own rows, mark as read only. Created by the server.
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- badges: public. Granted by cron or staff.
create policy badges_select on public.badges
  for select using (true);
create policy badges_staff_write on public.badges
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy user_badges_select on public.user_badges
  for select using (true);
create policy user_badges_staff_write on public.user_badges
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- moderation_log: staff read; staff and TL4 append. Never updated or deleted.
create policy moderation_log_select_staff on public.moderation_log
  for select to authenticated using (public.is_staff());
create policy moderation_log_insert on public.moderation_log
  for insert to authenticated
  with check (actor_id = auth.uid() and (public.is_staff() or public.current_trust_level() >= 4));

-- user_stats_daily: members write their own reading stats, staff read all.
create policy user_stats_daily_select on public.user_stats_daily
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy user_stats_daily_write_own on public.user_stats_daily
  for insert to authenticated with check (user_id = auth.uid());
create policy user_stats_daily_update_own on public.user_stats_daily
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- blog_posts: published ones are public, staff manage.
create policy blog_posts_select on public.blog_posts
  for select using (published_at is not null and published_at <= now() or public.is_staff());
create policy blog_posts_staff_write on public.blog_posts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- email tables: server only, via the service role. Staff can read for support.
create policy email_subscribers_staff_select on public.email_subscribers
  for select to authenticated using (public.is_staff());
create policy email_sequence_steps_staff on public.email_sequence_steps
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy email_sends_staff_select on public.email_sends
  for select to authenticated using (public.is_staff());

-- Grants. Supabase sets these by default for new tables; stated here so the
-- schema is self-describing and the PGlite test matches production.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
