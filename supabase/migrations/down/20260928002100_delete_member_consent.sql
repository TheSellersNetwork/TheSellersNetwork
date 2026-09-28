-- Reverses 20260928002100_delete_member_consent.sql
drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
  );

create or replace function public.profiles_protect_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_staff() then
    new.trust_level = old.trust_level;
    new.is_staff = old.is_staff;
    new.is_suspended = old.is_suspended;
    new.suspended_until = old.suspended_until;
    new.suspension_reason = old.suspension_reason;
    new.post_count = old.post_count;
    new.likes_received = old.likes_received;
    new.days_visited = old.days_visited;
    new.created_at = old.created_at;
    new.solution_count = old.solution_count;
    new.last_seen_at = old.last_seen_at;
    new.onboarded_at = case when old.onboarded_at is null and new.onboarded_at is not null then now() else old.onboarded_at end;
    new.rules_accepted_at = case when new.rules_accepted_at is not null and new.rules_accepted_at is distinct from old.rules_accepted_at then now() else old.rules_accepted_at end;
  end if;
  return new;
end;
$$;

drop function if exists public.delete_member(uuid, boolean);
