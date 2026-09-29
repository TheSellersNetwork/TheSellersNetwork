-- Reverses 20260930000100_member_forum_email.sql
drop trigger if exists topic_tags_notify_followers on public.topic_tags;
drop function if exists public.topic_tags_notify_followers();

drop index if exists public.notifications_tag_topic_idx;
delete from public.notifications where type = 'tag_topic';
alter table public.notifications drop constraint notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (
  type in ('reply', 'mention', 'quote', 'like', 'solution', 'badge', 'moderation', 'message', 'digest')
);

drop table if exists public.fee_alert_sends;
drop table if exists public.fee_changes_seen;
drop table if exists public.digest_sends;

drop trigger if exists member_email_prefs_stamp on public.member_email_prefs;
drop table if exists public.member_email_prefs;
drop function if exists public.member_email_prefs_stamp();

drop table if exists public.tag_follows;
