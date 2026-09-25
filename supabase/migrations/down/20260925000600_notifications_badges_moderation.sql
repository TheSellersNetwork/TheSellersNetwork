-- Reverses 20260925000600_notifications_badges_moderation.sql
drop table if exists public.user_stats_daily;
drop trigger if exists moderation_log_immutable on public.moderation_log;
drop table if exists public.moderation_log;
drop table if exists public.user_badges;
drop table if exists public.badges;
drop table if exists public.notifications;
