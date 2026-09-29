-- Saved calculations: a member keeps a fee calculator result under a name and
-- reopens it later. Private to the member: nobody else, not even other
-- members, can read them. At most 200 per member.
-- Down: supabase/migrations/down/20260930000300_saved_calculations.sql

create table public.saved_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  -- Which calculator: a fee engine platform id, 'all' (every platform at one price) or 'amazon_fba'.
  platform text not null,
  -- The figures typed into the calculator, as the calculator reads them back.
  inputs jsonb not null,
  -- The result when it was saved (fees, what you receive, profit), to compare with today's fees.
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_calculations_name_length check (char_length(name) between 1 and 80),
  constraint saved_calculations_platform_valid check (platform in ('all', 'ebay_private', 'ebay_business', 'vinted', 'depop', 'etsy', 'tiktok_shop', 'whatnot', 'ebay_live', 'facebook_collection', 'amazon_fbm', 'amazon_fba')),
  constraint saved_calculations_inputs_object check (jsonb_typeof(inputs) = 'object' and pg_column_size(inputs) <= 4000),
  constraint saved_calculations_result_object check (result is null or (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 2000))
);

create index saved_calculations_user_idx on public.saved_calculations (user_id, created_at desc);

create trigger saved_calculations_set_updated_at
  before update on public.saved_calculations
  for each row execute function public.set_updated_at();

-- Members cannot move a calculation to someone else or backdate it, and can
-- keep at most 200.
create or replace function public.saved_calculations_protect()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.created_at = now();
      if (select count(*) from public.saved_calculations where user_id = new.user_id) >= 200 then
        raise exception 'saved_calculations_limit' using errcode = 'check_violation';
      end if;
    else
      new.user_id = old.user_id;
      new.created_at = old.created_at;
    end if;
  end if;
  return new;
end;
$$;

create trigger saved_calculations_protect
  before insert or update on public.saved_calculations
  for each row execute function public.saved_calculations_protect();

alter table public.saved_calculations enable row level security;
create policy saved_calculations_select_own on public.saved_calculations
  for select to authenticated using (user_id = auth.uid());
create policy saved_calculations_insert_own on public.saved_calculations
  for insert to authenticated with check (user_id = auth.uid());
create policy saved_calculations_update_own on public.saved_calculations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_calculations_delete_own on public.saved_calculations
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.saved_calculations from anon;
grant select, insert, update, delete on public.saved_calculations to authenticated;
grant all on public.saved_calculations to service_role;
