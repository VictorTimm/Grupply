-- Provision registration in one transaction so auth sign-up does not leave
-- partial organization/profile state behind on retryable failures.

create or replace function public.provision_registration(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_biography text default null,
  p_hobby_names text[] default '{}'::text[],
  p_join_code text default null,
  p_organization_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_existing_profile_org uuid;
  v_join_code text;
  v_organization_name text;
  v_member_role text;
begin
  if p_user_id is null then
    raise exception 'registration_user_required';
  end if;

  v_join_code := nullif(trim(p_join_code), '');
  v_organization_name := nullif(trim(p_organization_name), '');

  if (v_join_code is null and v_organization_name is null)
    or (v_join_code is not null and v_organization_name is not null) then
    raise exception 'registration_flow_invalid';
  end if;

  if v_join_code is not null then
    select o.id
      into v_org_id
    from public.organizations o
    where o.join_code is not null
      and lower(trim(o.join_code)) = lower(v_join_code)
    limit 1;

    if v_org_id is null then
      raise exception 'invalid_join_code';
    end if;

    v_member_role := 'member';
  else
    insert into public.organizations (name, created_by)
    values (v_organization_name, p_user_id)
    returning id into v_org_id;

    v_member_role := 'owner';
  end if;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (v_org_id, p_user_id, v_member_role)
  on conflict (organization_id, user_id) do update
    set member_role = excluded.member_role;

  select p.organization_id
    into v_existing_profile_org
  from public.profiles p
  where p.user_id = p_user_id;

  if v_existing_profile_org is null then
    insert into public.profiles (
      user_id,
      organization_id,
      first_name,
      last_name,
      biography,
      app_role
    )
    values (
      p_user_id,
      v_org_id,
      p_first_name,
      p_last_name,
      p_biography,
      'user'
    );
  elsif v_existing_profile_org = v_org_id then
    update public.profiles
    set first_name = p_first_name,
        last_name = p_last_name,
        biography = p_biography
    where user_id = p_user_id;
  else
    raise exception 'profile_exists_in_other_org';
  end if;

  if coalesce(array_length(p_hobby_names, 1), 0) > 0 then
    insert into public.user_hobbies (organization_id, user_id, hobby_id)
    select v_org_id, p_user_id, h.id
    from public.hobbies h
    where h.name = any (p_hobby_names)
    on conflict (organization_id, user_id, hobby_id) do nothing;
  end if;

  insert into public.audit_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id
  )
  select v_org_id, p_user_id, 'auth.register', 'user', p_user_id
  where not exists (
    select 1
    from public.audit_logs a
    where a.organization_id = v_org_id
      and a.user_id = p_user_id
      and a.action = 'auth.register'
      and a.entity_id = p_user_id
  );

  return v_org_id;
end;
$$;

revoke all on function public.provision_registration(uuid, text, text, text, text[], text, text) from public;
grant execute on function public.provision_registration(uuid, text, text, text, text[], text, text) to service_role;
