-- People search that matches first/last name, biography, and auth email within the caller's org.
-- Fixes: (1) users searching by email see no results from the API; (2) single code path avoids
-- PostgREST + RLS edge cases on chained profile queries.

create or replace function public.search_org_people(p_query text)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_uid uuid;
  v_trim text;
  v_like text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  select p.organization_id
  into v_org
  from public.profiles p
  where p.user_id = v_uid;

  if v_org is null then
    return;
  end if;

  v_trim := nullif(trim(p_query), '');
  if v_trim is null then
    return;
  end if;

  v_like :=
    '%'
    || replace(replace(replace(v_trim, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
    || '%';

  return query
  select p.user_id, p.first_name, p.last_name, p.avatar_url
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.organization_id = v_org
    and (
      p.first_name ilike v_like escape '\'
      or p.last_name ilike v_like escape '\'
      or coalesce(p.biography, '') ilike v_like escape '\'
      or u.email ilike v_like escape '\'
    )
  order by p.last_name asc nulls last, p.first_name asc nulls last
  limit 5;
end;
$$;

revoke all on function public.search_org_people(text) from public;
grant execute on function public.search_org_people(text) to authenticated;
