-- Set a join code so teammates can register into this org (run as postgres / bypass RLS).
-- Codes are matched case-insensitively. Choose something unguessable if the id could leak.
--
-- New orgs get a join_code automatically (migration 0017 trigger + backfill). Use this file
-- only for emergency overrides or manual rotation outside the app.

-- update public.organizations
-- set join_code = 'your-secret-code-here'
-- where id = '00000000-0000-0000-0000-000000000000'::uuid;
