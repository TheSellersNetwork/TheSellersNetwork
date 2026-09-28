-- Pickups: members post what they picked up, what they paid, where, and later
-- what it sold for. BOLO ("be on the lookout") is built from those numbers.
-- Down: supabase/migrations/down/20260928002200_pickups.sql

create table public.pickups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  brand text,
  category text not null,
  source_type text not null,
  area text,
  paid numeric(10, 2) not null,
  expected numeric(10, 2),
  sold_price numeric(10, 2),
  sold_platform text,
  sold_at date,
  photo_url text,
  note text,
  like_count integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickups_title_length check (char_length(title) between 3 and 120),
  constraint pickups_brand_length check (brand is null or char_length(brand) between 1 and 60),
  constraint pickups_area_length check (area is null or char_length(area) between 2 and 60),
  constraint pickups_note_length check (note is null or char_length(note) <= 1000),
  constraint pickups_category_valid check (category in ('clothing', 'shoes', 'bags', 'accessories', 'homeware', 'kitchen', 'toys', 'games', 'books', 'media', 'electronics', 'collectables', 'jewellery', 'tools', 'sports', 'other')),
  constraint pickups_source_valid check (source_type in ('car_boot', 'charity_shop', 'clearance', 'online', 'auction', 'market', 'house_clearance', 'other')),
  constraint pickups_platform_valid check (sold_platform is null or sold_platform in ('ebay', 'vinted', 'amazon', 'depop', 'facebook', 'etsy', 'whatnot', 'tiktok_shop', 'other')),
  constraint pickups_money_range check (paid >= 0 and paid < 100000 and (expected is null or (expected >= 0 and expected < 100000)) and (sold_price is null or (sold_price >= 0 and sold_price < 100000))),
  constraint pickups_sold_consistent check ((sold_price is null) = (sold_platform is null)),
  -- Photos only from our own storage, so they cannot be tracking pixels.
  constraint pickups_photo_storage check (photo_url is null or photo_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/post-images/'),
  -- No links in free text: pickups are not adverts.
  constraint pickups_no_links check (coalesce(note, '') || ' ' || title !~* '(https?://|www\.)')
);

create index pickups_created_idx on public.pickups (created_at desc) where not is_hidden;
create index pickups_user_idx on public.pickups (user_id, created_at desc);
create index pickups_brand_idx on public.pickups (lower(brand)) where brand is not null;

create trigger pickups_set_updated_at
  before update on public.pickups
  for each row execute function public.set_updated_at();

-- Members can edit their own pickup (mainly to add the sold price), but not
-- counters, moderation or ownership. A member can post at most 20 a day.
create or replace function public.pickups_protect()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    if tg_op = 'INSERT' then
      new.like_count = 0;
      new.is_hidden = false;
      new.created_at = now();
      if (select count(*) from public.pickups where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
        raise exception 'posting_too_fast' using errcode = 'check_violation';
      end if;
    else
      new.user_id = old.user_id;
      new.like_count = old.like_count;
      new.is_hidden = old.is_hidden;
      new.created_at = old.created_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger pickups_protect
  before insert or update on public.pickups
  for each row execute function public.pickups_protect();

alter table public.pickups enable row level security;
create policy pickups_select on public.pickups
  for select using (not is_hidden or user_id = auth.uid() or public.is_staff());
create policy pickups_insert on public.pickups
  for insert to authenticated
  with check (user_id = auth.uid() and not public.is_suspended_now(auth.uid()));
create policy pickups_update_own on public.pickups
  for update to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
create policy pickups_delete_own on public.pickups
  for delete to authenticated using (user_id = auth.uid() or public.is_staff());

grant select on public.pickups to anon;
grant select, insert, update, delete on public.pickups to authenticated;
grant all on public.pickups to service_role;

-- "Nice find": one per member per pickup, not on your own.
create table public.pickup_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  pickup_id uuid not null references public.pickups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pickup_id)
);

alter table public.pickup_likes enable row level security;
create policy pickup_likes_select on public.pickup_likes for select using (true);
create policy pickup_likes_insert on public.pickup_likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and not exists (select 1 from public.pickups p where p.id = pickup_id and p.user_id = auth.uid())
  );
create policy pickup_likes_delete on public.pickup_likes
  for delete to authenticated using (user_id = auth.uid());
grant select on public.pickup_likes to anon;
grant select, insert, delete on public.pickup_likes to authenticated;
grant all on public.pickup_likes to service_role;

create or replace function public.pickup_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.pickups set like_count = like_count + 1 where id = new.pickup_id;
  else
    update public.pickups set like_count = greatest(like_count - 1, 0) where id = old.pickup_id;
  end if;
  return null;
end;
$$;

create trigger pickup_likes_count
  after insert or delete on public.pickup_likes
  for each row execute function public.pickup_likes_count();

-- BOLO: brands members have picked up and sold, with typical buy and sell
-- prices. Only shown once at least three pickups of a brand have sold, so a
-- single lucky find is never presented as a pattern.
create or replace function public.bolo_brands(p_days integer default 365, p_min_sold integer default 3)
returns table (
  brand text,
  pickups bigint,
  sold bigint,
  median_paid numeric,
  median_sold numeric,
  median_multiple numeric,
  top_category text,
  top_source text
)
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select *, initcap(trim(brand)) as brand_key
    from public.pickups
    where brand is not null and not is_hidden and created_at > now() - make_interval(days => least(greatest(p_days, 30), 3650))
  )
  select
    r.brand_key,
    count(*),
    count(r.sold_price),
    round(percentile_cont(0.5) within group (order by r.paid)::numeric, 2),
    round((percentile_cont(0.5) within group (order by r.sold_price) filter (where r.sold_price is not null))::numeric, 2),
    round((percentile_cont(0.5) within group (order by r.sold_price / nullif(r.paid, 0)) filter (where r.sold_price is not null and r.paid > 0))::numeric, 1),
    mode() within group (order by r.category),
    mode() within group (order by r.source_type)
  from recent r
  group by r.brand_key
  having count(r.sold_price) >= greatest(p_min_sold, 3)
  order by 6 desc nulls last, 3 desc
  limit 100;
$$;

grant execute on function public.bolo_brands(integer, integer) to anon, authenticated, service_role;
