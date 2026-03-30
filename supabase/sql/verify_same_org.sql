-- Run in Supabase SQL Editor (or psql as postgres) to compare organization_id for accounts.
-- Replace emails with the ones you are debugging. If organization_id differs, they will not
-- see each other in search / Find People — use move_user_to_organization.sql (emails only).
--
-- To discover UUIDs for one address, see lookup_user_org_by_email.sql.

select u.email, p.user_id, p.organization_id, o.name
from auth.users u
join public.profiles p on p.user_id = u.id
join public.organizations o on o.id = p.organization_id
where u.email in (
  'victor.m.timmermans@gmail.com',
  'victor.bifore@gmail.com'
);
