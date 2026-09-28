-- Follow-up to the security review: account deletion in one transaction,
-- consent records protected, no liking your own anonymous posts.
-- Down: supabase/migrations/down/20260928002100_delete_member_consent.sql

-- Deleting an account moves or removes the member's posts and deletes the
-- sign-in in a single transaction, so a failure part-way leaves nothing half done.
-- Called by the server only.
create or replace function public.delete_member(p_user uuid, p_remove_posts boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_holder uuid;
begin
  select profile_id into v_holder from public.site_accounts where key = 'deleted';
  if v_holder is null then
    raise exception 'deleted_account_missing';
  end if;
  if exists (select 1 from public.profiles where id = p_user and is_staff) then
    raise exception 'staff_account';
  end if;

  if p_remove_posts then
    update public.posts set is_deleted = true, deleted_at = now()
      where not is_deleted
        and (author_id = p_user or id in (select post_id from public.anonymous_authors where user_id = p_user));
  end if;

  update public.topics set author_id = v_holder where author_id = p_user;
  update public.topics set last_poster_id = v_holder where last_poster_id = p_user;
  update public.posts set author_id = v_holder where author_id = p_user;

  -- Cascades to the profile and everything tied to it.
  delete from auth.users where id = p_user;
end;
$$;

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
    -- Consent records are written by the server at sign-up and cannot be edited by members.
    new.terms_accepted_at = old.terms_accepted_at;
    new.age_confirmed_at = old.age_confirmed_at;
    new.rules_accepted_at = case when new.rules_accepted_at is not null and new.rules_accepted_at is distinct from old.rules_accepted_at then now() else old.rules_accepted_at end;
  end if;
  return new;
end;
$$;

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and not public.is_suspended_now(auth.uid())
    and not exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())
    and not exists (select 1 from public.anonymous_authors a where a.post_id = likes.post_id and a.user_id = auth.uid())
  );

revoke execute on function public.delete_member(uuid, boolean) from public, anon, authenticated;
grant execute on function public.delete_member(uuid, boolean) to service_role;
