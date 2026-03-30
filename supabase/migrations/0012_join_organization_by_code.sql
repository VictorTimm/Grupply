-- Optional join code on organizations + RPC so new users can join an existing org
-- without RLS allowing arbitrary self-insert into organization_members.

alter table public.organizations
  add column if not exists join_code text;

-- Case-insensitive uniqueness for non-empty codes (multiple NULLs allowed).
create unique index if not exists organizations_join_code_lower_idx
  on public.organizations (lower(trim(join_code)))
  where join_code is not null and length(trim(join_code)) > 0;

create or replace function public.join_organization_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_norm text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_norm := nullif(trim(p_code), '');
  if v_norm is null then
    raise exception 'invalid_join_code';
  end if;

  select o.id into v_org
  from public.organizations o
  where lower(trim(o.join_code)) = lower(v_norm);

  if v_org is null then
    raise exception 'invalid_join_code';
  end if;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (v_org, auth.uid(), 'member')
  on conflict (organization_id, user_id) do nothing;

  return v_org;
end;
$$;

revoke all on function public.join_organization_by_code(text) from public;
grant execute on function public.join_organization_by_code(text) to authenticated;
