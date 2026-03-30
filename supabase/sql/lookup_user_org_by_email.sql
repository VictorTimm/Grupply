-- Look up user_id and organization_id from email — no UUIDs required up front.
-- Run in SQL Editor; change the email or use ilike for a partial match.

-- Exact email:
select
  u.id as user_id,
  u.email,
  p.organization_id,
  o.name as organization_name
from auth.users u
left join public.profiles p on p.user_id = u.id
left join public.organizations o on o.id = p.organization_id
where lower(u.email) = lower('someone@example.com');

-- Partial match (optional):
-- select u.id, u.email, p.organization_id, o.name
-- from auth.users u
-- left join public.profiles p on p.user_id = u.id
-- left join public.organizations o on o.id = p.organization_id
-- where u.email ilike '%@company.com';
