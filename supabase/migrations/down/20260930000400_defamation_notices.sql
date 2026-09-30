-- Reverses 20260930002300_defamation_notices.sql
-- The moderation log is immutable, so rows already logged against contact
-- messages stay; the old check is restored without re-checking them.
alter table public.moderation_log drop constraint moderation_log_target_type_valid;
alter table public.moderation_log add constraint moderation_log_target_type_valid
  check (target_type in ('post', 'topic', 'user', 'flag', 'category', 'tag', 'group')) not valid;

drop trigger if exists defamation_notices_set_updated_at on public.defamation_notices;
drop table if exists public.defamation_notices;
