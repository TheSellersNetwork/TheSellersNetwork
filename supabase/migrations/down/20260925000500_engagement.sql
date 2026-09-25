-- Reverses 20260925000500_engagement.sql
drop trigger if exists topic_tags_after_change on public.topic_tags;
drop function if exists public.topic_tags_after_change();
drop table if exists public.topic_tags;
drop trigger if exists posts_record_revision on public.posts;
drop function if exists public.posts_record_revision();
drop table if exists public.post_revisions;
drop trigger if exists flags_after_insert on public.flags;
drop function if exists public.flags_after_insert();
drop table if exists public.flags;
drop table if exists public.topic_subscriptions;
drop table if exists public.bookmarks;
drop trigger if exists likes_after_change on public.likes;
drop function if exists public.likes_after_change();
drop table if exists public.likes;
