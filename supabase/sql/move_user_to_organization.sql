-- Move a user into the same organization as another user, using only email addresses.
-- Run in Supabase SQL Editor as postgres (or a role that bypasses RLS).
--
-- 1) Set anchor_email to someone who is ALREADY in the correct company org.
-- 2) Set move_email to the account that should be moved into that org.
--
-- This removes all of move_email's organization_members rows, then adds them to the
-- anchor's org and updates profiles.organization_id.

begin;

do $$
declare
  anchor_email text := 'main.account@example.com'; -- already in the right org
  move_email text := 'colleague@example.com'; -- account to fix
  target_org uuid;
  move_user uuid;
begin
  select p.organization_id
  into target_org
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = lower(trim(anchor_email));

  select u.id
  into move_user
  from auth.users u
  where lower(u.email) = lower(trim(move_email));

  if target_org is null then
    raise exception 'Anchor email not found or has no profile: %', anchor_email;
  end if;

  if move_user is null then
    raise exception 'User to move not found: %', move_email;
  end if;

  delete from public.organization_members om
  where om.user_id = move_user;

  insert into public.organization_members (organization_id, user_id, member_role)
  values (target_org, move_user, 'member')
  on conflict (organization_id, user_id) do update
  set member_role = excluded.member_role;

  update public.profiles p
  set organization_id = target_org
  where p.user_id = move_user;
end;
$$;

commit;

-- Note: Does not rewrite other org-scoped rows (events, conversations, etc.).
