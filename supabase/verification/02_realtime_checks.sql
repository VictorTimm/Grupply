-- Realtime checks (run in Supabase SQL Editor)

-- 1) Confirm required tables are in realtime publication.
select
  pt.schemaname,
  pt.tablename
from pg_publication_tables pt
where pt.pubname = 'supabase_realtime'
  and pt.schemaname = 'public'
  and pt.tablename in ('notifications', 'messages')
order by pt.tablename;

-- 2) Optional: inspect all realtime tables.
-- select * from pg_publication_tables where pubname = 'supabase_realtime' order by schemaname, tablename;

