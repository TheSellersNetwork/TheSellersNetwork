-- Member community extras:
--   * comments on pickups, with the same link rules as forum posts;
--   * "Would you have bought it at that price?" votes on pickups;
--   * self-declared milestones on profiles;
--   * a column to remember that a member dismissed the welcome checklist.
-- Counts on pickups are kept by triggers, like pickup_likes.
-- Down: supabase/migrations/down/20260930000200_pickup_talk_milestones_welcome.sql

-- Counters on pickups ---------------------------------------------------------

alter table public.pickups
  add column comment_count integer not null default 0,
  add column vote_yes_count integer not null default 0,
  add column vote_no_count integer not null default 0;

-- Same as before, plus the new counters are server-owned.
create or replace function public.pickups_protect()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.like_count = 0;
      new.comment_count = 0;
      new.vote_yes_count = 0;
      new.vote_no_count = 0;
      new.is_hidden = false;
      new.created_at = now();
      if (select count(*) from public.pickups where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
        raise exception 'posting_too_fast' using errcode = 'check_violation';
      end if;
    else
      new.user_id = old.user_id;
      new.like_count = old.like_count;
      new.comment_count = old.comment_count;
      new.vote_yes_count = old.vote_yes_count;
      new.vote_no_count = old.vote_no_count;
      new.is_hidden = old.is_hidden;
      new.created_at = old.created_at;
    end if;
  end if;
  return new;
end;
$$;

-- Pickup comments -------------------------------------------------------------

create table public.pickup_comments (
  id uuid primary key default gen_random_uuid(),
  pickup_id uuid not null references public.pickups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint pickup_comments_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index pickup_comments_pickup_idx on public.pickup_comments (pickup_id, created_at);
create index pickup_comments_user_idx on public.pickup_comments (user_id, created_at desc);

-- Members cannot set moderation fields or backdate, may post at most 30
-- comments an hour, and new members (trust level 0) cannot post links, the
-- same rule as forum posts.
create or replace function public.pickup_comments_protect()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.is_hidden = false;
    new.created_at = now();
    if (select count(*) from public.pickup_comments where user_id = new.user_id and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'posting_too_fast' using errcode = 'check_violation';
    end if;
    if public.current_trust_level() < 1
       and new.body ~* '(^|[^!])\[[^]]*\]\(https?://|(^|\s)(https?://|www\.)' then
      raise exception 'links_not_allowed' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger pickup_comments_protect
  before insert on public.pickup_comments
  for each row execute function public.pickup_comments_protect();

alter table public.pickup_comments enable row level security;
-- The pickups policy applies inside the subquery, so comments on a hidden
-- pickup are hidden with it.
create policy pickup_comments_select on public.pickup_comments
  for select using (
    (not is_hidden or user_id = auth.uid() or public.is_staff())
    and exists (select 1 from public.pickups p where p.id = pickup_id)
  );
create policy pickup_comments_insert on public.pickup_comments
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and exists (select 1 from public.pickups p where p.id = pickup_id and not p.is_hidden)
  );
-- Only staff change a comment (to hide it). Members delete and repost.
create policy pickup_comments_update_staff on public.pickup_comments
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy pickup_comments_delete on public.pickup_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

grant select on public.pickup_comments to anon;
grant select, insert, update, delete on public.pickup_comments to authenticated;
grant all on public.pickup_comments to service_role;

-- comment_count counts visible comments.
create or replace function public.pickup_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not new.is_hidden then
      update public.pickups set comment_count = comment_count + 1 where id = new.pickup_id;
    end if;
  elsif tg_op = 'DELETE' then
    if not old.is_hidden then
      update public.pickups set comment_count = greatest(comment_count - 1, 0) where id = old.pickup_id;
    end if;
  elsif old.is_hidden is distinct from new.is_hidden then
    update public.pickups
      set comment_count = greatest(comment_count + case when new.is_hidden then -1 else 1 end, 0)
      where id = new.pickup_id;
  end if;
  return null;
end;
$$;

create trigger pickup_comments_count
  after insert or delete or update of is_hidden on public.pickup_comments
  for each row execute function public.pickup_comments_count();

-- "Would you have bought it at that price?" ----------------------------------

create table public.pickup_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pickup_id uuid not null references public.pickups (id) on delete cascade,
  would_buy boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, pickup_id)
);

create index pickup_votes_pickup_idx on public.pickup_votes (pickup_id);

create trigger pickup_votes_set_updated_at
  before update on public.pickup_votes
  for each row execute function public.set_updated_at();

alter table public.pickup_votes enable row level security;
-- Individual votes are private: members see their own, the totals live on pickups.
create policy pickup_votes_select on public.pickup_votes
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy pickup_votes_insert on public.pickup_votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and exists (select 1 from public.pickups p where p.id = pickup_id and not p.is_hidden and p.user_id <> auth.uid())
  );
create policy pickup_votes_update on public.pickup_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pickup_votes_delete on public.pickup_votes
  for delete to authenticated using (user_id = auth.uid());

-- Only the answer can change, so a vote cannot be moved to another pickup.
grant select, insert, delete on public.pickup_votes to authenticated;
grant update (would_buy) on public.pickup_votes to authenticated;
grant all on public.pickup_votes to service_role;

create or replace function public.pickup_votes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.pickups
      set vote_yes_count = vote_yes_count + case when new.would_buy then 1 else 0 end,
          vote_no_count = vote_no_count + case when new.would_buy then 0 else 1 end
      where id = new.pickup_id;
  elsif tg_op = 'DELETE' then
    update public.pickups
      set vote_yes_count = greatest(vote_yes_count - case when old.would_buy then 1 else 0 end, 0),
          vote_no_count = greatest(vote_no_count - case when old.would_buy then 0 else 1 end, 0)
      where id = old.pickup_id;
  elsif old.would_buy is distinct from new.would_buy then
    update public.pickups
      set vote_yes_count = greatest(vote_yes_count + case when new.would_buy then 1 else -1 end, 0),
          vote_no_count = greatest(vote_no_count + case when new.would_buy then -1 else 1 end, 0)
      where id = new.pickup_id;
  end if;
  return null;
end;
$$;

create trigger pickup_votes_count
  after insert or delete or update of would_buy on public.pickup_votes
  for each row execute function public.pickup_votes_count();

-- Profile milestones ----------------------------------------------------------

-- Self-declared by the member ("100th sale", "1 year reselling"). Shown on
-- their profile, labelled as shared by them.
create table public.profile_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  happened_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_milestones_label_length check (char_length(btrim(label)) between 2 and 60),
  constraint profile_milestones_no_links check (label !~* '(https?://|www\.)'),
  constraint profile_milestones_date_range check (happened_on >= date '1990-01-01')
);

create index profile_milestones_user_idx on public.profile_milestones (user_id, happened_on desc);

create trigger profile_milestones_set_updated_at
  before update on public.profile_milestones
  for each row execute function public.set_updated_at();

-- At most 10 each, no future dates, and a milestone stays with its member.
create or replace function public.profile_milestones_protect()
returns trigger
language plpgsql
as $$
begin
  if new.happened_on > (now() at time zone 'Europe/London')::date then
    raise exception 'milestone_in_future' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' then
    if current_user in ('anon', 'authenticated') then
      new.created_at = now();
    end if;
    if (select count(*) from public.profile_milestones where user_id = new.user_id) >= 10 then
      raise exception 'too_many_milestones' using errcode = 'check_violation';
    end if;
  else
    new.user_id = old.user_id;
    new.created_at = old.created_at;
  end if;
  return new;
end;
$$;

create trigger profile_milestones_protect
  before insert or update on public.profile_milestones
  for each row execute function public.profile_milestones_protect();

alter table public.profile_milestones enable row level security;
create policy profile_milestones_select on public.profile_milestones for select using (true);
create policy profile_milestones_insert on public.profile_milestones
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_suspended_now(auth.uid()));
create policy profile_milestones_update on public.profile_milestones
  for update to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
create policy profile_milestones_delete on public.profile_milestones
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

grant select on public.profile_milestones to anon;
grant select, insert, update, delete on public.profile_milestones to authenticated;
grant all on public.profile_milestones to service_role;

-- Welcome checklist -----------------------------------------------------------

-- Set by the member when they dismiss the checklist. The profiles update
-- policy already limits this to their own row.
alter table public.profiles add column welcome_dismissed_at timestamptz;
