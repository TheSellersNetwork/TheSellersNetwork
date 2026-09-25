-- Topics and posts, with search vectors and the triggers that keep counters honest.
-- Down: supabase/migrations/down/20260925000400_topics_posts.sql

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  -- URL is /community/t/[slug]/[short_id]. The slug can change, the short_id never does.
  short_id text not null unique default public.generate_short_id(),
  slug text not null,
  title text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_unlisted boolean not null default false,
  is_solved boolean not null default false,
  solution_post_id uuid,
  view_count integer not null default 0,
  reply_count integer not null default 0,
  like_count integer not null default 0,
  last_post_at timestamptz not null default now(),
  last_poster_id uuid references public.profiles (id) on delete set null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
  ) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topics_title_length check (char_length(title) between 3 and 200),
  constraint topics_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$')
);

create index topics_category_last_post_idx
  on public.topics (category_id, is_pinned desc, last_post_at desc)
  where deleted_at is null;
create index topics_last_post_idx on public.topics (last_post_at desc) where deleted_at is null;
create index topics_author_idx on public.topics (author_id, created_at desc);
create index topics_unanswered_idx on public.topics (created_at desc)
  where reply_count = 0 and deleted_at is null;
create index topics_search_idx on public.topics using gin (search_vector);

create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

create or replace function public.topics_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug = coalesce(nullif(public.slugify(new.title), ''), 'topic');
  end if;
  if new.last_poster_id is null then
    new.last_poster_id = new.author_id;
  end if;
  return new;
end;
$$;

create trigger topics_before_insert
  before insert on public.topics
  for each row execute function public.topics_before_insert();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body_md text not null,
  -- Rendered and sanitised server-side, cached here. Null means not rendered yet.
  body_html text,
  reply_to_post_id uuid references public.posts (id) on delete set null,
  post_number integer not null,
  like_count integer not null default 0,
  is_deleted boolean not null default false,
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  -- Hidden pending review, either by flags or the word filter. Distinct from deleted.
  is_hidden boolean not null default false,
  hidden_at timestamptz,
  hidden_reason text,
  edited_at timestamptz,
  edit_count integer not null default 0,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(body_md, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (char_length(body_md) between 1 and 40000),
  constraint posts_topic_number_key unique (topic_id, post_number)
);

create index posts_author_created_idx on public.posts (author_id, created_at desc);
create index posts_search_idx on public.posts using gin (search_vector);
create index posts_recent_by_author_idx on public.posts (author_id, created_at desc)
  where is_deleted = false;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.topics
  add constraint topics_solution_post_fk
  foreign key (solution_post_id) references public.posts (id) on delete set null;

-- Assigns the next post_number under a row lock on the topic, and rejects a
-- body the same author posted in the last ten minutes.
create or replace function public.posts_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_next integer;
begin
  perform 1 from public.topics where id = new.topic_id for update;

  select coalesce(max(post_number), 0) + 1
    into v_next
    from public.posts
    where topic_id = new.topic_id;
  new.post_number = v_next;

  if exists (
    select 1
    from public.posts p
    where p.author_id = new.author_id
      and p.body_md = new.body_md
      and p.created_at > now() - interval '10 minutes'
  ) then
    raise exception 'duplicate_post'
      using errcode = 'unique_violation',
            hint = 'You posted the same thing in the last ten minutes.';
  end if;

  return new;
end;
$$;

create trigger posts_before_insert
  before insert on public.posts
  for each row execute function public.posts_before_insert();

-- Recomputes a topic's reply and like counters and last-post columns from its
-- live posts. Called after insert, delete, hide or undelete.
create or replace function public.refresh_topic_counters(p_topic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reply_count integer;
  v_like_count integer;
  v_last_post_at timestamptz;
  v_last_poster_id uuid;
  v_created_at timestamptz;
  v_author_id uuid;
begin
  select created_at, author_id into v_created_at, v_author_id
    from public.topics where id = p_topic_id;

  select
    count(*) filter (where post_number > 1),
    coalesce(sum(like_count), 0)
  into v_reply_count, v_like_count
  from public.posts
  where topic_id = p_topic_id and is_deleted = false and is_hidden = false;

  select created_at, author_id into v_last_post_at, v_last_poster_id
    from public.posts
    where topic_id = p_topic_id and is_deleted = false and is_hidden = false
    order by post_number desc
    limit 1;

  update public.topics
    set reply_count = v_reply_count,
        like_count = v_like_count,
        last_post_at = coalesce(v_last_post_at, v_created_at),
        last_poster_id = coalesce(v_last_poster_id, v_author_id)
    where id = p_topic_id;
end;
$$;

create or replace function public.posts_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_topic_counters(new.topic_id);
    update public.profiles set post_count = post_count + 1 where id = new.author_id;
    update public.categories c
      set post_count = c.post_count + 1
      from public.topics t
      where t.id = new.topic_id and c.id = t.category_id;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.is_deleted is distinct from new.is_deleted
       or old.is_hidden is distinct from new.is_hidden
       or old.like_count is distinct from new.like_count then
      perform public.refresh_topic_counters(new.topic_id);
    end if;
    if old.is_deleted = false and new.is_deleted = true then
      update public.profiles set post_count = greatest(post_count - 1, 0) where id = new.author_id;
    elsif old.is_deleted = true and new.is_deleted = false then
      update public.profiles set post_count = post_count + 1 where id = new.author_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_topic_counters(old.topic_id);
    return old;
  end if;

  return null;
end;
$$;

create trigger posts_after_change
  after insert or update or delete on public.posts
  for each row execute function public.posts_after_change();

-- Category topic counters.
create or replace function public.topics_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.categories set topic_count = topic_count + 1 where id = new.category_id;
    return new;
  end if;
  if tg_op = 'UPDATE' and old.category_id is distinct from new.category_id then
    update public.categories set topic_count = greatest(topic_count - 1, 0) where id = old.category_id;
    update public.categories set topic_count = topic_count + 1 where id = new.category_id;
    return new;
  end if;
  if tg_op = 'DELETE' then
    update public.categories set topic_count = greatest(topic_count - 1, 0) where id = old.category_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger topics_after_change
  after insert or update of category_id or delete on public.topics
  for each row execute function public.topics_after_change();

-- Can the caller see this topic. Wraps the category check and hides deleted topics.
create or replace function public.topic_visible(p_topic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.topics t
    where t.id = p_topic_id
      and (t.deleted_at is null or public.is_staff())
      and public.category_visible(t.category_id)
  );
$$;
