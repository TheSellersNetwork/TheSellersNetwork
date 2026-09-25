-- Reverses 20260925001100_partners_follows_reputation.sql
drop policy if exists category_follows_own on public.category_follows;
drop policy if exists placement_events_staff_select on public.placement_events;
drop policy if exists placements_staff on public.placements;
drop policy if exists partners_staff_write on public.partners;
drop policy if exists partners_select on public.partners;

drop trigger if exists topics_tag_answered on public.topics;
drop function if exists public.topics_tag_answered();

-- Restore can_post without the accepting_topics check.
create or replace function public.can_post(p_category_id uuid, p_is_topic boolean default true)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_category public.categories%rowtype;
  v_topics_today integer;
  v_replies_today integer;
begin
  if v_uid is null then return false; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then return false; end if;
  if v_profile.is_staff then return true; end if;
  if public.is_suspended_now(v_uid) then return false; end if;
  select * into v_category from public.categories where id = p_category_id;
  if not found then return false; end if;
  if v_category.is_private
     and (v_category.allowed_group_id is null or not public.is_member_of_group(v_category.allowed_group_id)) then
    return false;
  end if;
  if v_profile.trust_level < v_category.min_trust_to_post then return false; end if;
  if v_category.min_account_age_hours > 0
     and v_profile.created_at > now() - make_interval(hours => v_category.min_account_age_hours) then
    return false;
  end if;
  if v_profile.trust_level <= 1 then
    if p_is_topic then
      select count(*) into v_topics_today from public.topics where author_id = v_uid and created_at > now() - interval '24 hours';
      if v_topics_today >= 3 then return false; end if;
    else
      select count(*) into v_replies_today from public.posts where author_id = v_uid and post_number > 1 and created_at > now() - interval '24 hours';
      if v_replies_today >= 10 then return false; end if;
    end if;
  end if;
  return true;
end;
$$;

alter table public.categories
  drop column if exists accepting_topics,
  drop column if exists accepting_note;

drop function if exists public.top_answerers(integer, integer);
drop trigger if exists topics_count_solutions on public.topics;
drop function if exists public.topics_count_solutions();
alter table public.profiles drop column if exists solution_count;

drop table if exists public.category_follows;
drop function if exists public.record_placement_event(uuid, text, text, text);
drop function if exists public.live_placements(text, integer);
drop table if exists public.placement_events;
drop table if exists public.placements;
drop table if exists public.partners;
