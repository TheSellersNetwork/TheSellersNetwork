-- Defamation notices of complaint under the Defamation Act 2013 s5 and the
-- Defamation (Operators of Websites) Regulations 2013. Each notice hangs off
-- a contact_messages row (kind 'defamation') and records what the
-- complainant told us and what staff did, with times, so we can show we met
-- the deadlines that keep the website operator defence.
-- Down: supabase/migrations/down/20260930002300_defamation_notices.sql

create table public.defamation_notices (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.contact_messages (id) on delete cascade,
  -- What the complainant sent (s5(6) and reg 2). Written once by the server.
  complainant_name text not null,
  complainant_email text not null,
  statement text not null,
  statement_url text not null,
  meaning text not null,
  inaccuracies text not null,
  insufficient_info_confirmed boolean not null,
  consent_share_name boolean not null,
  consent_share_email boolean not null,
  previous_removals boolean not null default false,
  previous_details text,
  received_at timestamptz not null default now(),
  -- What staff did (Schedule paras 2 to 9).
  poster_contactable boolean,
  poster_notified_at timestamptz,
  complainant_acknowledged_at timestamptz,
  poster_response text,
  poster_response_at timestamptz,
  outcome text,
  outcome_at timestamptz,
  complainant_informed_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint defamation_notices_name_length check (char_length(complainant_name) between 1 and 200),
  constraint defamation_notices_email_format check (complainant_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(complainant_email) <= 254),
  constraint defamation_notices_statement_length check (char_length(statement) between 1 and 5000),
  constraint defamation_notices_url_format check (statement_url ~* '^https?://' and char_length(statement_url) <= 500),
  constraint defamation_notices_meaning_length check (char_length(meaning) between 1 and 5000),
  constraint defamation_notices_inaccuracies_length check (char_length(inaccuracies) between 1 and 5000),
  constraint defamation_notices_previous_length check (previous_details is null or char_length(previous_details) <= 2000),
  constraint defamation_notices_response_valid check (poster_response is null or poster_response in ('none', 'consented', 'refused_with_details', 'refused_without_details')),
  constraint defamation_notices_outcome_valid check (outcome is null or outcome in ('removed', 'kept')),
  constraint defamation_notices_outcome_time check ((outcome is null) = (outcome_at is null))
);

create index defamation_notices_received_idx on public.defamation_notices (received_at desc);

create trigger defamation_notices_set_updated_at
  before update on public.defamation_notices
  for each row execute function public.set_updated_at();

alter table public.defamation_notices enable row level security;
-- Staff read and record what they did. Nobody else can read notices, and
-- only the server (service role, after the bot check) creates them.
create policy defamation_notices_staff_select on public.defamation_notices
  for select to authenticated using (public.is_staff());
create policy defamation_notices_staff_update on public.defamation_notices
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
grant select on public.defamation_notices to authenticated;
-- Only the tracking columns can be changed; the complaint itself is our record and stays as sent.
grant update (poster_contactable, poster_notified_at, complainant_acknowledged_at, poster_response, poster_response_at, outcome, outcome_at, complainant_informed_at, updated_by)
  on public.defamation_notices to authenticated;
grant all on public.defamation_notices to service_role;

-- Staff actions on contact messages are logged against the message. The
-- inbox already wrote these rows, but the target type was not allowed.
alter table public.moderation_log drop constraint moderation_log_target_type_valid;
alter table public.moderation_log add constraint moderation_log_target_type_valid
  check (target_type in ('post', 'topic', 'user', 'flag', 'category', 'tag', 'group', 'contact_message'));
