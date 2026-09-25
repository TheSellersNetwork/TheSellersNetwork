-- Reverses 20260925001500_ask_the_team.sql
update public.categories set slug = 'ask-tom', name = 'Ask Tom' where slug = 'ask-the-team';
update public.tags set slug = 'ask-tom-answered', name = 'Ask Tom: answered' where slug = 'ask-the-team-answered';

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
  if v_slug is distinct from 'ask-tom' then
    return null;
  end if;
  select p.is_staff into v_by_staff from public.posts s join public.profiles p on p.id = s.author_id where s.id = new.solution_post_id;
  if not coalesce(v_by_staff, false) then
    return null;
  end if;
  insert into public.tags (slug, name) values ('ask-tom-answered', 'Ask Tom: answered')
    on conflict (slug) do nothing;
  select id into v_tag from public.tags where slug = 'ask-tom-answered';
  insert into public.topic_tags (topic_id, tag_id) values (new.id, v_tag) on conflict do nothing;
  return null;
end;
$$;
