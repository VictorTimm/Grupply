-- Fix messaging conversation creation RLS deadlock and RPC concurrency.
--
-- Problem: get_or_create_direct_conversation is SECURITY INVOKER, so RLS
-- applies during its execution. conversation_participants_insert_creator
-- checks conversations via a subquery, but conversations_select_participant
-- requires participant rows to exist first. This is a chicken-and-egg
-- deadlock on first conversation creation.
--
-- Fix: Make the RPC SECURITY DEFINER with explicit search_path. The function
-- already performs its own authorization checks (auth.uid(), org membership,
-- recipient validation) so this is safe. Also add unique_violation handling
-- for concurrent calls.

-- 1) Replace the RPC with SECURITY DEFINER + concurrency handling
create or replace function public.get_or_create_direct_conversation(recipient_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid;
  org_id uuid;
  low_id uuid;
  high_id uuid;
  existing_id uuid;
  new_conversation_id uuid;
begin
  me := auth.uid();
  if me is null then
    raise exception 'not_authenticated';
  end if;

  if recipient_user_id is null or recipient_user_id = me then
    raise exception 'invalid_recipient';
  end if;

  select p.organization_id into org_id
  from public.profiles p
  where p.user_id = me;

  if org_id is null then
    raise exception 'profile_missing';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = recipient_user_id
      and p.organization_id = org_id
  ) then
    raise exception 'recipient_not_in_organization';
  end if;

  low_id := least(me, recipient_user_id);
  high_id := greatest(me, recipient_user_id);

  -- Check for existing conversation first
  select c.id into existing_id
  from public.conversations c
  where c.organization_id = org_id
    and c.direct_pair_low = low_id
    and c.direct_pair_high = high_id
  limit 1;

  if existing_id is not null then
    -- Ensure both participants exist (repair if somehow missing)
    insert into public.conversation_participants (conversation_id, user_id)
    values
      (existing_id, me),
      (existing_id, recipient_user_id)
    on conflict do nothing;

    return existing_id;
  end if;

  -- Create new conversation with concurrency safety
  begin
    insert into public.conversations (
      organization_id,
      created_by,
      direct_pair_low,
      direct_pair_high
    ) values (
      org_id,
      me,
      low_id,
      high_id
    )
    returning id into new_conversation_id;
  exception
    when unique_violation then
      -- Concurrent insert won the race; fetch the existing row
      select c.id into new_conversation_id
      from public.conversations c
      where c.organization_id = org_id
        and c.direct_pair_low = low_id
        and c.direct_pair_high = high_id
      limit 1;

      if new_conversation_id is null then
        raise exception 'conversation_creation_failed';
      end if;
  end;

  -- Add both participants
  insert into public.conversation_participants (conversation_id, user_id)
  values
    (new_conversation_id, me),
    (new_conversation_id, recipient_user_id)
  on conflict do nothing;

  return new_conversation_id;
end;
$$;

-- Re-grant execute permission
revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
