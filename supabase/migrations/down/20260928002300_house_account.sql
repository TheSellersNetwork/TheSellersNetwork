-- Reverses 20260928002300_house_account.sql
-- The house profile itself stays; only its site_accounts link is removed.
delete from public.site_accounts where key = 'house';
alter table public.site_accounts drop constraint site_accounts_key_valid;
alter table public.site_accounts add constraint site_accounts_key_valid check (key in ('anonymous', 'deleted'));
