-- GDPR support helpers

create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.messages where sender_id = uid;
  delete from public.conversation_participants where user_id = uid;
  delete from public.user_connections where user_id = uid or connection_id = uid;
  delete from public.event_attendees where user_id = uid;
  delete from public.user_hobbies where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.audit_logs where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from public.organization_members where user_id = uid;

  -- Note: auth.users row deletion requires Supabase admin privileges.
end;
$$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;

