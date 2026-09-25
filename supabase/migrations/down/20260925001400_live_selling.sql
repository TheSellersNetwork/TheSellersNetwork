-- Reverses 20260925001400_live_selling.sql
update public.profiles set marketplaces = array_remove(marketplaces, 'live');
alter table public.profiles drop constraint profiles_marketplaces_valid;
alter table public.profiles add constraint profiles_marketplaces_valid check (
  marketplaces <@ array['ebay', 'amazon', 'vinted', 'etsy', 'depop', 'facebook', 'own_website', 'other']::text[]
);
