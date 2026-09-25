-- Flair, forum layouts (deals and gallery), deal votes and heat, kits, streaks.
-- Down: supabase/migrations/down/20260925001700_flair_deals_kits_streaks.sql

-- Flair: self-declared, per platform, no links. [{"platform":"ebay","since":2016,"label":"Top Rated"}]
alter table public.profiles add column flair jsonb not null default '[]'::jsonb;

create or replace function public.profiles_check_flair()
returns trigger
language plpgsql
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(new.flair) <> 'array' or jsonb_array_length(new.flair) > 6 then
    raise exception 'flair_invalid' using errcode = 'check_violation';
  end if;
  for item in select * from jsonb_array_elements(new.flair) loop
    if not (new.marketplaces @> array[item ->> 'platform']) then
      raise exception 'flair_platform_not_yours' using errcode = 'check_violation';
    end if;
    if item ? 'since' and ((item ->> 'since')::int < 1995 or (item ->> 'since')::int > extract(year from now())::int) then
      raise exception 'flair_year_invalid' using errcode = 'check_violation';
    end if;
    if item ? 'label' and (char_length(item ->> 'label') > 24 or (item ->> 'label') ~* '(https?://|www\.|\.co|\.com)') then
      raise exception 'flair_label_invalid' using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end;
$$;

create trigger profiles_check_flair
  before insert or update of flair, marketplaces on public.profiles
  for each row execute function public.profiles_check_flair();

-- Forum layouts: list (default), deals (sorted by heat, expiry dates), gallery (photo tiles).
alter table public.categories add column layout text not null default 'list';
alter table public.categories add constraint categories_layout_valid check (layout in ('list', 'deals', 'gallery'));

-- Deals: expiry and "still valid" votes.
alter table public.topics add column expires_at timestamptz;

create table public.deal_votes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  vote text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, topic_id),
  constraint deal_votes_vote_valid check (vote in ('valid', 'expired'))
);

create index deal_votes_topic_idx on public.deal_votes (topic_id, vote);

alter table public.deal_votes enable row level security;
create policy deal_votes_select on public.deal_votes for select using (true);
create policy deal_votes_own on public.deal_votes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.deal_votes to anon;
grant select, insert, update, delete on public.deal_votes to authenticated;
grant all on public.deal_votes to service_role;

-- Heat: valid votes and likes, minus expired votes, cooling by age. Expired deals sink.
create or replace function public.deal_topics(p_category_id uuid, p_limit integer default 50)
returns table (topic_id uuid, heat numeric, valid_votes bigint, expired_votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select t.id,
    round(
      ((coalesce(v.valid, 0) * 2 + t.like_count + t.reply_count * 0.5 - coalesce(v.expired, 0) * 3)
        / power(1 + extract(epoch from now() - t.created_at) / 86400.0, 0.6)
      ) - case when t.expires_at is not null and t.expires_at < now() then 100 else 0 end,
      3
    ) as heat,
    coalesce(v.valid, 0), coalesce(v.expired, 0)
  from public.topics t
  left join (
    select topic_id,
      count(*) filter (where vote = 'valid') as valid,
      count(*) filter (where vote = 'expired') as expired
    from public.deal_votes group by topic_id
  ) v on v.topic_id = t.id
  where t.category_id = p_category_id and t.deleted_at is null
  order by t.is_pinned desc, heat desc, t.created_at desc
  limit p_limit;
$$;

-- Kits: "my setup" pages.
create table public.kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  is_public boolean not null default true,
  copied_from uuid references public.kits (id) on delete set null,
  copy_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kits_title_length check (char_length(title) between 3 and 80),
  constraint kits_description_length check (description is null or char_length(description) <= 1000)
);

create index kits_user_idx on public.kits (user_id);
create index kits_public_idx on public.kits (updated_at desc) where is_public;

create trigger kits_set_updated_at before update on public.kits for each row execute function public.set_updated_at();

create table public.kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits (id) on delete cascade,
  kind text not null default 'other',
  name text not null,
  price_paid numeric(10, 2),
  bought_from text,
  url text,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint kit_items_kind_valid check (kind in ('printer', 'scales', 'packaging', 'software', 'storage', 'camera', 'shipping', 'other')),
  constraint kit_items_name_length check (char_length(name) between 1 and 120),
  constraint kit_items_note_length check (note is null or char_length(note) <= 300),
  constraint kit_items_url_format check (url is null or url ~* '^https?://')
);

create index kit_items_kit_idx on public.kit_items (kit_id, position);

alter table public.kits enable row level security;
alter table public.kit_items enable row level security;

create policy kits_select on public.kits for select using (is_public or user_id = auth.uid() or public.is_staff());
create policy kits_own on public.kits
  for all to authenticated using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy kit_items_select on public.kit_items
  for select using (exists (select 1 from public.kits k where k.id = kit_id and (k.is_public or k.user_id = auth.uid() or public.is_staff())));
create policy kit_items_own on public.kit_items
  for all to authenticated
  using (exists (select 1 from public.kits k where k.id = kit_id and (k.user_id = auth.uid() or public.is_staff())))
  with check (exists (select 1 from public.kits k where k.id = kit_id and (k.user_id = auth.uid() or public.is_staff())));

grant select on public.kits, public.kit_items to anon;
grant select, insert, update, delete on public.kits, public.kit_items to authenticated;
grant all on public.kits, public.kit_items to service_role;

-- Copy a public kit into the caller's own kits.
create or replace function public.copy_kit(p_kit_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid;
  v_source public.kits%rowtype;
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into v_source from public.kits where id = p_kit_id and (is_public or user_id = auth.uid());
  if not found then
    raise exception 'kit not found' using errcode = 'no_data_found';
  end if;
  insert into public.kits (user_id, title, description, is_public, copied_from)
    values (auth.uid(), left(v_source.title || ' (copy)', 80), v_source.description, false, v_source.id)
    returning id into v_new;
  insert into public.kit_items (kit_id, kind, name, price_paid, bought_from, url, note, position)
    select v_new, kind, name, price_paid, bought_from, url, note, position from public.kit_items where kit_id = p_kit_id;
  update public.kits set copy_count = copy_count + 1 where id = p_kit_id;
  return v_new;
end;
$$;

-- Streak: consecutive weekly numbers threads (by ISO week) the member has posted in, ending this week or last.
create or replace function public.numbers_streak(p_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weeks date[];
  v_streak integer := 0;
  v_expect date := date_trunc('week', now())::date;
  w date;
begin
  select array_agg(distinct date_trunc('week', t.created_at)::date order by date_trunc('week', t.created_at)::date desc)
    into v_weeks
  from public.posts p
  join public.topics t on t.id = p.topic_id
  where p.author_id = p_user_id
    and p.post_number > 1
    and not p.is_deleted
    and t.title ilike 'What did you sell this week%';
  if v_weeks is null then
    return 0;
  end if;
  -- A streak may still be alive if this week's thread has not been answered yet.
  if v_weeks[1] = v_expect - 7 then
    v_expect := v_expect - 7;
  end if;
  foreach w in array v_weeks loop
    if w = v_expect then
      v_streak := v_streak + 1;
      v_expect := v_expect - 7;
    else
      exit;
    end if;
  end loop;
  return v_streak;
end;
$$;

grant execute on all functions in schema public to anon, authenticated, service_role;
