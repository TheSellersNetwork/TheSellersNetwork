-- Reverses 20260925000400_topics_posts.sql
drop function if exists public.topic_visible(uuid);
drop trigger if exists topics_after_change on public.topics;
drop function if exists public.topics_after_change();
drop trigger if exists posts_after_change on public.posts;
drop function if exists public.posts_after_change();
drop function if exists public.refresh_topic_counters(uuid);
drop trigger if exists posts_before_insert on public.posts;
drop function if exists public.posts_before_insert();
alter table if exists public.topics drop constraint if exists topics_solution_post_fk;
drop table if exists public.posts;
drop trigger if exists topics_before_insert on public.topics;
drop function if exists public.topics_before_insert();
drop table if exists public.topics;
