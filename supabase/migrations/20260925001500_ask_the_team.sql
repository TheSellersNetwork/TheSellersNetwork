-- Renames the Ask Tom forum to Ask the team and points the auto-tag at it.
-- Down: supabase/migrations/down/20260925001500_ask_the_team.sql

update public.categories set slug = 'ask-the-team', name = 'Ask the team' where slug = 'ask-tom';
update public.tags set slug = 'ask-the-team-answered', name = 'Ask the team: answered' where slug = 'ask-tom-answered';

create or replace function public.topics_tag_answered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_tag uuid;
  v_by_staff boolean;
begin
  if new.solution_post_id is null or new.solution_post_id is not distinct from old.solution_post_id then
    return null;
  end if;
  select c.slug into v_slug from public.categories c where c.id = new.category_id;
  if v_slug is distinct from 'ask-the-team' then
    return null;
  end if;
  select p.is_staff into v_by_staff from public.posts s join public.profiles p on p.id = s.author_id where s.id = new.solution_post_id;
  if not coalesce(v_by_staff, false) then
    return null;
  end if;
  insert into public.tags (slug, name) values ('ask-the-team-answered', 'Ask the team: answered')
    on conflict (slug) do nothing;
  select id into v_tag from public.tags where slug = 'ask-the-team-answered';
  insert into public.topic_tags (topic_id, tag_id) values (new.id, v_tag) on conflict do nothing;
  return null;
end;
$$;
