-- Reverses 20260930000200_pickup_talk_milestones_welcome.sql
alter table public.profiles drop column if exists welcome_dismissed_at;

drop trigger if exists profile_milestones_protect on public.profile_milestones;
drop function if exists public.profile_milestones_protect();
drop table if exists public.profile_milestones;

drop trigger if exists pickup_votes_count on public.pickup_votes;
drop function if exists public.pickup_votes_count();
drop table if exists public.pickup_votes;

drop trigger if exists pickup_comments_count on public.pickup_comments;
drop function if exists public.pickup_comments_count();
drop trigger if exists pickup_comments_protect on public.pickup_comments;
drop function if exists public.pickup_comments_protect();
drop table if exists public.pickup_comments;

-- Back to the version in 20260928002200_pickups.sql.
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

alter table public.pickups
  drop column if exists vote_no_count,
  drop column if exists vote_yes_count,
  drop column if exists comment_count;
