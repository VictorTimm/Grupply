-- Fix self-referential RLS on conversation_participants SELECT.
-- The old policy only used EXISTS(subquery on conversation_participants), so reading
-- your own row required already being able to read a participant row in that conversation
-- (chicken-and-egg). Server actions that SELECT participants after creating a conversation
-- then failed with an RLS error.
--
-- New rule: you may read a row if it is your own participant row, OR you already have
-- any participant row in the same conversation (the other person's row becomes visible).

drop policy if exists conversation_participants_select_participant on public.conversation_participants;

create policy conversation_participants_select_participant
on public.conversation_participants
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_participants.conversation_id
      and cp.user_id = auth.uid()
  )
);
