-- Live selling (Whatnot, eBay Live, TikTok Live) as a place a member can say they sell.
-- Down: supabase/migrations/down/20260925001400_live_selling.sql

alter table public.profiles drop constraint profiles_marketplaces_valid;
alter table public.profiles add constraint profiles_marketplaces_valid check (
  marketplaces <@ array['ebay', 'amazon', 'vinted', 'etsy', 'depop', 'facebook', 'own_website', 'live', 'other']::text[]
);
