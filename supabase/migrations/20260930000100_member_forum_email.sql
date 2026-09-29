-- Member forum and email features: followed tags, email preferences for the
-- weekly digest and fee change alerts, send records so nothing goes twice,
-- and an in-app notification when a new topic carries a followed tag.
-- Down: supabase/migrations/down/20260930000100_member_forum_email.sql

-- Followed tags --------------------------------------------------------------

create table public.tag_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create index tag_follows_tag_idx on public.tag_follows (tag_id);

alter table public.tag_follows enable row level security;

create policy tag_follows_select_own on public.tag_follows
  for select to authenticated using (user_id = auth.uid());
create policy tag_follows_insert_own on public.tag_follows
  for insert to authenticated with check (user_id = auth.uid());
create policy tag_follows_delete_own on public.tag_follows
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.tag_follows to authenticated;
grant all on public.tag_follows to service_role;

-- Email preferences ------------------------------------------------------------
-- Both emails are opt-in, so every flag starts off. The *_changed_at columns
-- are the consent record: set by the database whenever the choice changes, and
-- never by the member directly.

create table public.member_email_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  weekly_digest boolean not null default false,
  weekly_digest_changed_at timestamptz,
  fee_alerts boolean not null default false,
  fee_alerts_changed_at timestamptz,
  fee_alert_platforms text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_email_prefs_platforms_valid check (
    fee_alert_platforms <@ array['ebay', 'vinted', 'amazon', 'etsy', 'depop', 'tiktok-shop', 'royal-mail', 'evri', 'hmrc']::text[]
  )
);

create or replace function public.member_email_prefs_stamp()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.weekly_digest_changed_at = now();
    new.fee_alerts_changed_at = now();
    new.created_at = now();
  else
    new.created_at = old.created_at;
    new.weekly_digest_changed_at = case when new.weekly_digest is distinct from old.weekly_digest then now() else old.weekly_digest_changed_at end;
    new.fee_alerts_changed_at = case
      when new.fee_alerts is distinct from old.fee_alerts or new.fee_alert_platforms is distinct from old.fee_alert_platforms then now()
      else old.fee_alerts_changed_at
    end;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger member_email_prefs_stamp
  before insert or update on public.member_email_prefs
  for each row execute function public.member_email_prefs_stamp();

alter table public.member_email_prefs enable row level security;

create policy member_email_prefs_select_own on public.member_email_prefs
  for select to authenticated using (user_id = auth.uid());
create policy member_email_prefs_insert_own on public.member_email_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy member_email_prefs_update_own on public.member_email_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.member_email_prefs to authenticated;
grant all on public.member_email_prefs to service_role;

-- Send records ---------------------------------------------------------------
-- Written by the crons with the service role. Members can read their own.

create table public.digest_sends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The Monday the digest covers up to, so a rerun the same week sends nothing.
  week_start date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.digest_sends enable row level security;
create policy digest_sends_select_own on public.digest_sends
  for select to authenticated using (user_id = auth.uid());
grant select on public.digest_sends to authenticated;
grant all on public.digest_sends to service_role;

-- One row per fee or policy change the cron has seen. Changes that existed
-- before the first run are 'baseline' and never emailed.
create table public.fee_changes_seen (
  slug text primary key,
  platform text not null,
  status text not null default 'sending',
  first_seen_at timestamptz not null default now(),
  done_at timestamptz,
  constraint fee_changes_seen_status_valid check (status in ('baseline', 'sending', 'done')),
  constraint fee_changes_seen_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$')
);

alter table public.fee_changes_seen enable row level security;
create policy fee_changes_seen_staff on public.fee_changes_seen
  for select to authenticated using (public.is_staff());
grant select on public.fee_changes_seen to authenticated;
grant all on public.fee_changes_seen to service_role;

create table public.fee_alert_sends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  change_slug text not null references public.fee_changes_seen (slug) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (user_id, change_slug)
);

alter table public.fee_alert_sends enable row level security;
create policy fee_alert_sends_select_own on public.fee_alert_sends
  for select to authenticated using (user_id = auth.uid());
grant select on public.fee_alert_sends to authenticated;
grant all on public.fee_alert_sends to service_role;

-- New topic with a followed tag ------------------------------------------------

alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (
  type in ('reply', 'mention', 'quote', 'like', 'solution', 'badge', 'moderation', 'message', 'digest', 'tag_topic')
);

create index notifications_tag_topic_idx on public.notifications (user_id, ((payload ->> 'topic_id')))
  where type = 'tag_topic';

-- Tags are added one row at a time, so a topic with three followed tags would
-- otherwise notify a member three times. One notification per member per
-- topic, only for topics under a day old (a tag added to an old thread is not
-- news), never to the author, never where the member cannot see the category
-- or has muted it.
create or replace function public.topic_tags_notify_followers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic public.topics%rowtype;
  v_tag public.tags%rowtype;
  v_parent uuid;
begin
  select * into v_topic from public.topics where id = new.topic_id;
  if v_topic.id is null or v_topic.deleted_at is not null or v_topic.is_unlisted
     or v_topic.created_at < now() - interval '1 day' then
    return null;
  end if;
  select * into v_tag from public.tags where id = new.tag_id;
  select parent_id into v_parent from public.categories where id = v_topic.category_id;

  insert into public.notifications (user_id, type, payload)
    select f.user_id, 'tag_topic', jsonb_build_object(
      'topic_id', v_topic.id,
      'topic_slug', v_topic.slug,
      'topic_short_id', v_topic.short_id,
      'topic_title', v_topic.title,
      'tag_slug', v_tag.slug,
      'tag_name', v_tag.name
    )
    from public.tag_follows f
    where f.tag_id = new.tag_id
      and f.user_id <> v_topic.author_id
      and public.user_can_see_category(f.user_id, v_topic.category_id)
      and not exists (
        select 1 from public.category_follows cf
        where cf.user_id = f.user_id and cf.level = 'muted'
          and (cf.category_id = v_topic.category_id or cf.category_id = v_parent)
      )
      and not exists (
        select 1 from public.notifications n
        where n.user_id = f.user_id and n.type = 'tag_topic' and n.payload ->> 'topic_id' = v_topic.id::text
      );
  return null;
end;
$$;

create trigger topic_tags_notify_followers
  after insert on public.topic_tags
  for each row execute function public.topic_tags_notify_followers();

revoke execute on function public.topic_tags_notify_followers() from public, anon, authenticated;
revoke execute on function public.member_email_prefs_stamp() from public, anon, authenticated;
