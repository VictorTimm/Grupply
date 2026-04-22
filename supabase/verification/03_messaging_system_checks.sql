-- Messaging system verification
-- Run each section in the Supabase SQL Editor to confirm the DB is properly configured.
-- All queries are read-only; nothing here modifies data.

-- -----------------------------------------------------------------------
-- 1. Confirm realtime publication includes messages (required for live UX)
-- -----------------------------------------------------------------------
select
  pt.tablename,
  'OK — in supabase_realtime' as result
from pg_publication_tables pt
where pt.pubname = 'supabase_realtime'
  and pt.tablename = 'messages'
union all
select
  'messages' as tablename,
  'MISSING — run migration 0005 to add messages to supabase_realtime' as result
where not exists (
  select 1
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime' and pt.tablename = 'messages'
);

-- -----------------------------------------------------------------------
-- 2. Confirm get_or_create_direct_conversation is SECURITY DEFINER
--    (required to avoid RLS deadlock on first conversation creation)
-- -----------------------------------------------------------------------
select
  p.proname as function_name,
  case p.prosecdef
    when true then 'OK — SECURITY DEFINER'
    else 'WRONG — must be SECURITY DEFINER; re-run migration 0007'
  end as security_mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'get_or_create_direct_conversation';

-- -----------------------------------------------------------------------
-- 3. Confirm conversation_participants SELECT policy allows self-read
--    (required so startConversationAction can verify participant rows)
-- -----------------------------------------------------------------------
select
  policyname,
  qual as using_expression,
  'OK — policy exists' as result
from pg_policies
where schemaname = 'public'
  and tablename = 'conversation_participants'
  and policyname = 'conversation_participants_select_participant';

-- -----------------------------------------------------------------------
-- 4. Confirm all messaging tables have RLS enabled
-- -----------------------------------------------------------------------
select
  relname as table_name,
  case relrowsecurity
    when true then 'OK — RLS enabled'
    else 'WARNING — RLS is off on this table'
  end as rls_status
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('conversations', 'conversation_participants', 'messages')
order by c.relname;

-- -----------------------------------------------------------------------
-- 5. Confirm authenticated role has EXECUTE on the RPC
-- -----------------------------------------------------------------------
select
  routine_name,
  grantee,
  privilege_type,
  'OK — grant present' as result
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'get_or_create_direct_conversation'
  and grantee = 'authenticated';

-- -----------------------------------------------------------------------
-- 6. Confirm the direct pair unique index exists (prevents duplicate DMs)
-- -----------------------------------------------------------------------
select
  indexname,
  indexdef,
  'OK — unique index exists' as result
from pg_indexes
where schemaname = 'public'
  and tablename = 'conversations'
  and indexname = 'conversations_direct_pair_unique';

-- -----------------------------------------------------------------------
-- 7. Quick counts — sanity check that tables are accessible
-- -----------------------------------------------------------------------
select 'conversations' as tbl, count(*) from public.conversations
union all
select 'conversation_participants', count(*) from public.conversation_participants
union all
select 'messages', count(*) from public.messages;
