-- Partners and sponsor placements, category follows, member reputation,
-- the Ask Tom window and the auto-tag for answered questions.
-- Down: supabase/migrations/down/20260925001100_partners_follows_reputation.sql

-- Partners ---------------------------------------------------------------

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  url text not null,
  logo_url text,
  blurb text,
  category text not null default 'other',
  -- partner: no money changes hands. sponsored and affiliate are labelled on the site.
  relationship text not null default 'partner',
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  constraint partners_category_valid check (category in ('postage', 'bookkeeping', 'sourcing', 'software', 'other')),
  constraint partners_relationship_valid check (relationship in ('partner', 'sponsored', 'affiliate')),
  constraint partners_blurb_length check (blurb is null or char_length(blurb) <= 600),
  constraint partners_url_format check (url ~* '^https?://')
);

create trigger partners_set_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

-- A placement is one paid slot for a partner between two dates.
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  slot text not null,
  headline text not null,
  body text,
  cta_label text not null default 'Find out more',
  url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  weight integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint placements_slot_valid check (slot in ('rail', 'topic_list')),
  constraint placements_headline_length check (char_length(headline) between 1 and 90),
  constraint placements_body_length check (body is null or char_length(body) <= 240),
  constraint placements_weight_positive check (weight >= 1),
  constraint placements_dates_ordered check (ends_at is null or ends_at > starts_at)
);

create index placements_live_idx on public.placements (slot, starts_at, ends_at) where is_active;

create trigger placements_set_updated_at
  before update on public.placements
  for each row execute function public.set_updated_at();

-- Impressions and clicks. One row per event; counted for the admin page.
-- Nothing personal is stored: viewer_hash is a salted day-hash of the IP.
create table public.placement_events (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null references public.placements (id) on delete cascade,
  kind text not null,
  page text,
  viewer_hash text,
  created_at timestamptz not null default now(),
  constraint placement_events_kind_valid check (kind in ('impression', 'click'))
);

create index placement_events_placement_idx on public.placement_events (placement_id, kind, created_at desc);

-- Live placements for a slot, weighted random order.
create or replace function public.live_placements(p_slot text, p_limit integer default 1)
returns setof public.placements
language sql
stable
security definer
set search_path = public
as $$
  select pl.*
  from public.placements pl
  join public.partners pa on pa.id = pl.partner_id
  where pl.slot = p_slot
    and pl.is_active
    and pa.is_active
    and pl.starts_at <= now()
    and (pl.ends_at is null or pl.ends_at > now())
  order by random() * pl.weight desc
  limit p_limit;
$$;

-- Records one event. Impressions are deduplicated per viewer per placement per day.
create or replace function public.record_placement_event(p_placement_id uuid, p_kind text, p_page text, p_viewer_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind = 'impression' and p_viewer_hash is not null and exists (
    select 1 from public.placement_events
    where placement_id = p_placement_id and kind = 'impression' and viewer_hash = p_viewer_hash and created_at > now() - interval '1 day'
  ) then
    return;
  end if;
  insert into public.placement_events (placement_id, kind, page, viewer_hash)
    values (p_placement_id, p_kind, left(p_page, 200), p_viewer_hash);
end;
$$;

-- Category follows ----------------------------------------------------------

create table public.category_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  level text not null default 'following',
  created_at timestamptz not null default now(),
  primary key (user_id, category_id),
  constraint category_follows_level_valid check (level in ('following', 'muted'))
);

create index category_follows_category_idx on public.category_follows (category_id);

-- Reputation -----------------------------------------------------------------

alter table public.profiles add column solution_count integer not null default 0;

create index profiles_solution_count_idx on public.profiles (solution_count desc);

-- Keeps solution_count current when a solution is set, changed or removed.
create or replace function public.topics_count_solutions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_author uuid;
  v_new_author uuid;
begin
  if old.solution_post_id is not distinct from new.solution_post_id then
    return null;
  end if;
  if old.solution_post_id is not null then
    select author_id into v_old_author from public.posts where id = old.solution_post_id;
    update public.profiles set solution_count = greatest(solution_count - 1, 0) where id = v_old_author;
  end if;
  if new.solution_post_id is not null then
    select author_id into v_new_author from public.posts where id = new.solution_post_id;
    update public.profiles set solution_count = solution_count + 1 where id = v_new_author;
  end if;
  return null;
end;
$$;

create trigger topics_count_solutions
  after update of solution_post_id on public.topics
  for each row execute function public.topics_count_solutions();

-- Members with the most accepted answers in the last N days.
create or replace function public.top_answerers(p_days integer default 30, p_limit integer default 5)
returns table (id uuid, username text, display_name text, avatar_url text, trust_level smallint, is_staff boolean, solutions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.trust_level, p.is_staff, count(*) as solutions
  from public.topics t
  join public.posts s on s.id = t.solution_post_id
  join public.profiles p on p.id = s.author_id
  where t.is_solved
    and t.deleted_at is null
    and t.updated_at > now() - make_interval(days => p_days)
    and s.author_id <> t.author_id
  group by p.id
  order by solutions desc, p.likes_received desc
  limit p_limit;
$$;

-- Ask Tom window -------------------------------------------------------------

-- When false, nobody but staff can start a topic in the category. Replies still work.
alter table public.categories
  add column accepting_topics boolean not null default true,
  add column accepting_note text;

create or replace function public.can_post(p_category_id uuid, p_is_topic boolean default true)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_category public.categories%rowtype;
  v_topics_today integer;
  v_replies_today integer;
begin
  if v_uid is null then
    return false;
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    return false;
  end if;

  if v_profile.is_staff then
    return true;
  end if;

  if public.is_suspended_now(v_uid) then
    return false;
  end if;

  select * into v_category from public.categories where id = p_category_id;
  if not found then
    return false;
  end if;

  if p_is_topic and not v_category.accepting_topics then
    return false;
  end if;

  if v_category.is_private
     and (v_category.allowed_group_id is null or not public.is_member_of_group(v_category.allowed_group_id)) then
    return false;
  end if;

  if v_profile.trust_level < v_category.min_trust_to_post then
    return false;
  end if;

  if v_category.min_account_age_hours > 0
     and v_profile.created_at > now() - make_interval(hours => v_category.min_account_age_hours) then
    return false;
  end if;

  -- Daily caps: 3 topics and 10 replies. The brief lifts all caps at TL2,
  -- so TL0 and TL1 are both capped.
  if v_profile.trust_level <= 1 then
    if p_is_topic then
      select count(*) into v_topics_today
        from public.topics
        where author_id = v_uid and created_at > now() - interval '24 hours';
      if v_topics_today >= 3 then
        return false;
      end if;
    else
      select count(*) into v_replies_today
        from public.posts
        where author_id = v_uid and post_number > 1 and created_at > now() - interval '24 hours';
      if v_replies_today >= 10 then
        return false;
      end if;
    end if;
  end if;

  return true;
end;
$$;

-- When a staff reply is accepted in an "ask" category, tag the topic so the
-- digest script and the blog can collect it.
create or replace function public.topics_tag_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_tag uuid;
  v_by_staff boolean;
begin
  if new.solution_post_id is null or new.solution_post_id is not distinct from old.solution_post_id then
    return null;
  end if;
  select c.slug into v_slug from public.categories c where c.id = new.category_id;
  if v_slug is distinct from 'ask-tom' then
    return null;
  end if;
  select p.is_staff into v_by_staff from public.posts s join public.profiles p on p.id = s.author_id where s.id = new.solution_post_id;
  if not coalesce(v_by_staff, false) then
    return null;
  end if;
  insert into public.tags (slug, name) values ('ask-tom-answered', 'Ask Tom: answered')
    on conflict (slug) do nothing;
  select id into v_tag from public.tags where slug = 'ask-tom-answered';
  insert into public.topic_tags (topic_id, tag_id) values (new.id, v_tag) on conflict do nothing;
  return null;
end;
$$;

create trigger topics_tag_answered
  after update of solution_post_id on public.topics
  for each row execute function public.topics_tag_answered();

-- Policies -------------------------------------------------------------------

alter table public.partners enable row level security;
alter table public.placements enable row level security;
alter table public.placement_events enable row level security;
alter table public.category_follows enable row level security;

create policy partners_select on public.partners
  for select using (is_active or public.is_staff());
create policy partners_staff_write on public.partners
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Placements are read through live_placements(); staff see all.
create policy placements_staff on public.placements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy placement_events_staff_select on public.placement_events
  for select to authenticated using (public.is_staff());

create policy category_follows_own on public.category_follows
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.partners, public.placements, public.placement_events, public.category_follows to anon;
grant select, insert, update, delete on public.partners, public.placements, public.placement_events, public.category_follows to authenticated;
grant all on public.partners, public.placements, public.placement_events, public.category_follows to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
