-- Fix recursive messaging RLS checks by routing participant lookups through a
-- SECURITY DEFINER helper instead of self-referential policy subqueries.

create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop policy if exists conversations_select_participant on public.conversations;
create policy conversations_select_participant
on public.conversations
for select
using (
  public.is_org_member(organization_id)
  and public.is_conversation_participant(id)
);

drop policy if exists conversation_participants_select_participant on public.conversation_participants;
create policy conversation_participants_select_participant
on public.conversation_participants
for select
using (
  user_id = auth.uid()
  or public.is_conversation_participant(conversation_id)
);

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant
on public.messages
for select
using (
  public.is_org_member(organization_id)
  and public.is_conversation_participant(conversation_id)
);

drop policy if exists messages_insert_sender_participant on public.messages;
create policy messages_insert_sender_participant
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and public.is_org_member(organization_id)
  and public.is_conversation_participant(conversation_id)
);
