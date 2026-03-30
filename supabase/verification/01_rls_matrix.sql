-- RLS matrix verification (run in Supabase SQL Editor)
-- 1) Fill in IDs from Auth users + created org rows.
-- 2) Run this script and inspect NOTICE lines + result sets.
--
-- IMPORTANT:
-- - This script simulates authenticated users by setting JWT claims.
-- - Keep "set local role authenticated" so RLS is applied.

begin;

-- Replace placeholders before running:
--   user_a_id, user_b_id in org_1_id
--   user_c_id in org_2_id
do $$
declare
  user_a_id uuid := '00000000-0000-0000-0000-00000000000a';
  user_b_id uuid := '00000000-0000-0000-0000-00000000000b';
  user_c_id uuid := '00000000-0000-0000-0000-00000000000c';
  org_1_id uuid := '11111111-1111-1111-1111-111111111111';
  org_2_id uuid := '22222222-2222-2222-2222-222222222222';
  count_a int;
  count_c int;
begin
  -- ---------- User A (org1) ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into count_a
  from public.profiles
  where organization_id = org_1_id;
  raise notice 'UserA sees profiles in org1: %', count_a;

  select count(*) into count_c
  from public.profiles
  where organization_id = org_2_id;
  raise notice 'UserA sees profiles in org2 (must be 0): %', count_c;

  -- ---------- User C (org2) ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_c_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into count_c
  from public.profiles
  where organization_id = org_2_id;
  raise notice 'UserC sees profiles in org2: %', count_c;

  select count(*) into count_a
  from public.profiles
  where organization_id = org_1_id;
  raise notice 'UserC sees profiles in org1 (must be 0): %', count_a;

  -- ---------- Events visibility ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  raise notice 'UserA events visible: %', (select count(*) from public.events);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_c_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  raise notice 'UserC events visible: %', (select count(*) from public.events);

  -- ---------- Notifications ownership ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_a_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  raise notice 'UserA notifications visible: %', (select count(*) from public.notifications);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_c_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  raise notice 'UserC notifications visible: %', (select count(*) from public.notifications);

  -- ---------- Messages participant access ----------
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', user_b_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  raise notice 'UserB messages visible: %', (select count(*) from public.messages);

end
$$;

rollback;

