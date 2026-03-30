-- Guardrails + Realtime publication wiring

-- Ensure notifications/messages are part of Supabase realtime publication.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;

-- ---------- direct conversation uniqueness ----------
alter table public.conversations
  add column if not exists direct_pair_low uuid,
  add column if not exists direct_pair_high uuid;

alter table public.conversations
  drop constraint if exists conversations_direct_pair_valid;

alter table public.conversations
  add constraint conversations_direct_pair_valid
  check (
    (direct_pair_low is null and direct_pair_high is null)
    or (
      direct_pair_low is not null
      and direct_pair_high is not null
      and direct_pair_low <> direct_pair_high
    )
  );

create unique index if not exists conversations_direct_pair_unique
  on public.conversations (organization_id, direct_pair_low, direct_pair_high)
  where direct_pair_low is not null and direct_pair_high is not null;

create or replace function public.get_or_create_direct_conversation(recipient_user_id uuid)
returns uuid
language plpgsql
security invoker
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

  select c.id into existing_id
  from public.conversations c
  where c.organization_id = org_id
    and c.direct_pair_low = low_id
    and c.direct_pair_high = high_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

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

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (new_conversation_id, me),
    (new_conversation_id, recipient_user_id)
  on conflict do nothing;

  return new_conversation_id;
end;
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ---------- event capacity enforcement ----------
create or replace function public.join_event_with_capacity(target_event_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid;
  org_id uuid;
  event_org_id uuid;
  event_status text;
  event_capacity int;
  attendee_count int;
begin
  me := auth.uid();
  if me is null then
    raise exception 'not_authenticated';
  end if;

  if target_event_id is null then
    raise exception 'invalid_event';
  end if;

  select p.organization_id into org_id
  from public.profiles p
  where p.user_id = me;

  if org_id is null then
    raise exception 'profile_missing';
  end if;

  select e.organization_id, e.status, e.capacity
    into event_org_id, event_status, event_capacity
  from public.events e
  where e.id = target_event_id
  for update;

  if event_org_id is null then
    raise exception 'event_not_found';
  end if;

  if event_org_id <> org_id then
    raise exception 'cross_org_forbidden';
  end if;

  if event_status <> 'active' then
    raise exception 'event_not_active';
  end if;

  if exists (
    select 1
    from public.event_attendees ea
    where ea.event_id = target_event_id
      and ea.user_id = me
  ) then
    return;
  end if;

  select count(*)::int into attendee_count
  from public.event_attendees ea
  where ea.event_id = target_event_id;

  if attendee_count >= event_capacity then
    raise exception 'event_capacity_reached';
  end if;

  insert into public.event_attendees (
    organization_id,
    event_id,
    user_id
  ) values (
    org_id,
    target_event_id,
    me
  );
end;
$$;

grant execute on function public.join_event_with_capacity(uuid) to authenticated;

