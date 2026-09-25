-- Notifications, badges, the immutable moderation log and daily reading stats.
-- Down: supabase/migrations/down/20260925000600_notifications_badges_moderation.sql

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_valid check (
    type in ('reply', 'mention', 'quote', 'like', 'solution', 'badge', 'moderation', 'message', 'digest')
  )
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  -- A query returning user_id rows. Run nightly by the badge cron (Phase B).
  criteria_sql text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint badges_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$')
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles (id) on delete set null,
  primary key (user_id, badge_id)
);

-- Every staff and TL4 action is recorded here. Rows can never change.
create table public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_log_target_type_valid
    check (target_type in ('post', 'topic', 'user', 'flag', 'category', 'tag', 'group'))
);

create index moderation_log_target_idx on public.moderation_log (target_type, target_id, created_at desc);
create index moderation_log_actor_idx on public.moderation_log (actor_id, created_at desc);

create trigger moderation_log_immutable
  before update or delete on public.moderation_log
  for each row execute function public.prevent_change();

-- Feeds the trust level cron. One row per member per day.
create table public.user_stats_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  topics_read integer not null default 0,
  posts_read integer not null default 0,
  time_read_secs integer not null default 0,
  likes_given integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index user_stats_daily_day_idx on public.user_stats_daily (day desc);

create trigger user_stats_daily_set_updated_at
  before update on public.user_stats_daily
  for each row execute function public.set_updated_at();
