-- Run in Supabase SQL Editor as postgres (or service role). Replace the two emails.
-- Confirms both accounts share the same organization_id and have a membership row.
--
-- If the two rows in query (1) show DIFFERENT organization_id, Search and Find People will
-- never show the other person until you run move_user_to_organization.sql (same postgres role).

-- 1) Profile + org (must be identical organization_id for search / Find People)
select
  u.email,
  p.user_id,
  p.organization_id,
  o.name as organization_name,
  p.first_name,
  p.last_name
from auth.users u
join public.profiles p on p.user_id = u.id
join public.organizations o on o.id = p.organization_id
where u.email in (
  'first.user@example.com',
  'second.user@example.com'
)
order by u.email;

-- 2) Membership rows (each user_id should appear with the SAME organization_id as above)
select u.email, om.organization_id, om.member_role
from auth.users u
join public.organization_members om on om.user_id = u.id
where u.email in (
  'first.user@example.com',
  'second.user@example.com'
)
order by u.email;

-- 3) Summary: distinct org ids across these accounts (must be 1)
select count(distinct p.organization_id) as distinct_org_ids_for_these_accounts
from auth.users u
join public.profiles p on p.user_id = u.id
where u.email in (
  'first.user@example.com',
  'second.user@example.com'
);
