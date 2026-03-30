-- Grupply V1 RPC helpers

create or replace function public.suggested_matches(p_user_id uuid, p_limit int default 20)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  shared_interests bigint
)
language sql
stable
as $$
  with me as (
    select p.organization_id
    from public.profiles p
    where p.user_id = p_user_id
  ),
  my_hobbies as (
    select uh.hobby_id
    from public.user_hobbies uh
    join me on me.organization_id = uh.organization_id
    where uh.user_id = p_user_id
  ),
  connected as (
    select uc.user_low as a, uc.user_high as b
    from public.user_connections uc
    join me on me.organization_id = uc.organization_id
    where uc.user_id = p_user_id or uc.connection_id = p_user_id
  )
  select
    p.user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    count(uh.hobby_id) as shared_interests
  from public.profiles p
  join me on me.organization_id = p.organization_id
  join public.user_hobbies uh
    on uh.user_id = p.user_id
   and uh.organization_id = p.organization_id
  where p.user_id <> p_user_id
    and uh.hobby_id in (select hobby_id from my_hobbies)
    and not exists (
      select 1
      from connected c
      where (c.a = least(p_user_id, p.user_id) and c.b = greatest(p_user_id, p.user_id))
    )
  group by p.user_id, p.first_name, p.last_name, p.avatar_url
  order by shared_interests desc, p.last_name asc, p.first_name asc
  limit greatest(1, p_limit);
$$;

