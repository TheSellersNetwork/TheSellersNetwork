-- Reverses 20260925000900_signup_notifications_limits.sql
drop function if exists public.recompute_trust_levels();
drop trigger if exists topics_notify_solution on public.topics;
drop function if exists public.topics_notify_solution();
drop trigger if exists posts_notify on public.posts;
drop function if exists public.posts_notify();
drop trigger if exists posts_auto_subscribe on public.posts;
drop trigger if exists topics_auto_subscribe on public.topics;
drop function if exists public.auto_subscribe();
drop function if exists public.record_activity(integer, integer, integer, integer);
drop function if exists public.increment_view_count(uuid);
drop function if exists public.check_rate_limit(text, integer, interval);
drop table if exists public.rate_limits;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
alter table public.profiles
  drop column if exists email_on_reply,
  drop column if exists email_on_mention,
  drop column if exists email_digest;
