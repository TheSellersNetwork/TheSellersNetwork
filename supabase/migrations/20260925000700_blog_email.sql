-- Blog post index (bodies are MDX in the repo) and the free email course tables.
-- Down: supabase/migrations/down/20260925000700_blog_email.sql

create table public.blog_posts (
  slug text primary key,
  title text not null,
  excerpt text,
  author_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  category text,
  platforms text[] not null default '{}',
  related_topic_ids uuid[] not null default '{}',
  -- Created automatically on publish. Comments live on the forum only.
  discussion_topic_id uuid references public.topics (id) on delete set null,
  cover text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,120}$')
);

create index blog_posts_published_idx on public.blog_posts (published_at desc) where published_at is not null;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

create table public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  status text not null default 'pending',
  -- Which page the signup form was on, for the PostHog funnel and the roundup.
  source text,
  user_id uuid references public.profiles (id) on delete set null,
  confirm_token text unique,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_subscribers_status_valid check (status in ('pending', 'active', 'unsubscribed', 'bounced')),
  constraint email_subscribers_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create unique index email_subscribers_email_key on public.email_subscribers (lower(email));

create trigger email_subscribers_set_updated_at
  before update on public.email_subscribers
  for each row execute function public.set_updated_at();

create table public.email_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence text not null default 'course',
  step_number smallint not null,
  subject text not null,
  -- Key of the React Email template to render.
  template_key text not null,
  delay_days smallint not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint email_sequence_steps_unique unique (sequence, step_number)
);

create table public.email_sends (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.email_subscribers (id) on delete cascade,
  step_id uuid not null references public.email_sequence_steps (id) on delete cascade,
  status text not null default 'queued',
  provider_message_id text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  constraint email_sends_status_valid check (status in ('queued', 'sent', 'failed', 'skipped')),
  constraint email_sends_once_per_step unique (subscriber_id, step_id)
);

create index email_sends_due_idx on public.email_sends (scheduled_for) where status = 'queued';
