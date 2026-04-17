-- Resolve organization id by join code for server-side provisioning (e.g. service role)
-- without requiring an authenticated session. Mirrors join_organization_by_code lookup rules.

create or replace function public.resolve_org_id_by_join_code(p_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_org uuid;
begin
  v_norm := nullif(trim(p_code), '');
  if v_norm is null then
    return null;
  end if;

  select o.id into v_org
  from public.organizations o
  where o.join_code is not null
    and lower(trim(o.join_code)) = lower(v_norm)
  limit 1;

  return v_org;
end;
$$;

revoke all on function public.resolve_org_id_by_join_code(text) from public;
grant execute on function public.resolve_org_id_by_join_code(text) to service_role;
