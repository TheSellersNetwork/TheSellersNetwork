-- The house account: "The Sellers Network", a clearly labelled staff account
-- that posts the recurring threads, discussion starters and fee change
-- threads. It never signs in. Created by the seed script.
-- Down: supabase/migrations/down/20260928002300_house_account.sql

alter table public.site_accounts drop constraint site_accounts_key_valid;
alter table public.site_accounts add constraint site_accounts_key_valid check (key in ('anonymous', 'deleted', 'house'));
