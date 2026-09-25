-- pglite:skip
-- Publishes topic and post inserts over Supabase Realtime so open pages can
-- show "new topics" and "new reply" bars. Row-level security still applies:
-- a browser only receives rows it is allowed to select.
-- Down: supabase/migrations/down/20260925001300_realtime.sql

alter publication supabase_realtime add table public.topics;
alter publication supabase_realtime add table public.posts;
