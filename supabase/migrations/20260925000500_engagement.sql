-- Likes, bookmarks, subscriptions, flags, edit history and topic tags.
-- Down: supabase/migrations/down/20260925000500_engagement.sql

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index likes_post_id_idx on public.likes (post_id);

create or replace function public.likes_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid := coalesce(new.post_id, old.post_id);
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  v_author_id uuid;
begin
  update public.posts
    set like_count = greatest(like_count + v_delta, 0)
    where id = v_post_id
    returning author_id into v_author_id;

  update public.profiles
    set likes_received = greatest(likes_received + v_delta, 0)
    where id = v_author_id;

  return null;
end;
$$;

create trigger likes_after_change
  after insert or delete on public.likes
  for each row execute function public.likes_after_change();

create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  constraint bookmarks_note_length check (note is null or char_length(note) <= 500)
);

create table public.topic_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  level text not null default 'watching',
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id),
  constraint topic_subscriptions_level_valid check (level in ('watching', 'tracking', 'muted'))
);

create index topic_subscriptions_topic_idx on public.topic_subscriptions (topic_id, level);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flags_reason_valid
    check (reason in ('spam', 'selling', 'off_topic', 'abuse', 'policy_evasion', 'other')),
  constraint flags_status_valid check (status in ('open', 'agreed', 'disagreed', 'ignored')),
  constraint flags_note_length check (note is null or char_length(note) <= 1000),
  constraint flags_one_per_reporter unique (post_id, reporter_id)
);

create index flags_open_idx on public.flags (created_at desc) where status = 'open';

-- Auto-hide: a post is hidden once its open flags score three or more, where a
-- flag from TL3 or above, or from staff, scores three and a flag from TL1 or
-- above scores one. TL0 flags are recorded but do not count.
-- The email to the author is sent by the app when it sees hidden_reason = 'flags'.
create or replace function public.flags_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score integer;
begin
  select coalesce(sum(
    case
      when p.is_staff or p.trust_level >= 3 then 3
      when p.trust_level >= 1 then 1
      else 0
    end
  ), 0)
  into v_score
  from public.flags f
  join public.profiles p on p.id = f.reporter_id
  where f.post_id = new.post_id and f.status = 'open';

  if v_score >= 3 then
    update public.posts
      set is_hidden = true,
          hidden_at = coalesce(hidden_at, now()),
          hidden_reason = coalesce(hidden_reason, 'flags')
      where id = new.post_id and is_hidden = false;
  end if;

  return null;
end;
$$;

create trigger flags_after_insert
  after insert on public.flags
  for each row execute function public.flags_after_insert();

-- Edit history. Every body change stores the previous version.
create table public.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  editor_id uuid references public.profiles (id) on delete set null,
  body_md text not null,
  created_at timestamptz not null default now()
);

create index post_revisions_post_idx on public.post_revisions (post_id, created_at desc);

create or replace function public.posts_record_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.body_md is distinct from new.body_md then
    insert into public.post_revisions (post_id, editor_id, body_md)
      values (old.id, auth.uid(), old.body_md);
    new.edited_at = now();
    new.edit_count = old.edit_count + 1;
    -- The cached render is stale until the app re-renders it.
    if new.body_html is not distinct from old.body_html then
      new.body_html = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger posts_record_revision
  before update of body_md on public.posts
  for each row execute function public.posts_record_revision();

create table public.topic_tags (
  topic_id uuid not null references public.topics (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, tag_id)
);

create index topic_tags_tag_idx on public.topic_tags (tag_id);

create or replace function public.topic_tags_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.tags set topic_count = topic_count + 1 where id = new.tag_id;
  else
    update public.tags set topic_count = greatest(topic_count - 1, 0) where id = old.tag_id;
  end if;
  return null;
end;
$$;

create trigger topic_tags_after_change
  after insert or delete on public.topic_tags
  for each row execute function public.topic_tags_after_change();
