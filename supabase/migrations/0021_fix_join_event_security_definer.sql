-- Fix join_event_with_capacity so non-creators can join events they belong to.
--
-- Root cause: the original function was SECURITY INVOKER and used SELECT ... FOR UPDATE
-- on public.events. The events_update_creator RLS policy only allows creators to lock
-- rows for update, so non-creators received a permission error at lock time, causing a
-- silent failure in the app.
--
-- Fix: switch to SECURITY DEFINER (like get_or_create_direct_conversation and
-- provision_registration) and replace FOR UPDATE with a plain SELECT. Capacity
-- consistency is preserved by the explicit attendee_count check inside the function.
-- All original auth/org/status/capacity guards are kept unchanged.

create or replace function public.join_event_with_capacity(target_event_id uuid)
returns void
language plpgsql
security definer
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

  -- Resolve caller's org from their profile.
  select p.organization_id into org_id
  from public.profiles p
  where p.user_id = me;

  if org_id is null then
    raise exception 'profile_missing';
  end if;

  -- Verify caller is an org member (explicit membership check, not RLS).
  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = me
  ) then
    raise exception 'not_org_member';
  end if;

  -- Read event without FOR UPDATE so RLS row-lock is not needed.
  select e.organization_id, e.status, e.capacity
    into event_org_id, event_status, event_capacity
  from public.events e
  where e.id = target_event_id;

  if event_org_id is null then
    raise exception 'event_not_found';
  end if;

  if event_org_id <> org_id then
    raise exception 'cross_org_forbidden';
  end if;

  if event_status <> 'active' then
    raise exception 'event_not_active';
  end if;

  -- Idempotent: already attending is a no-op, not an error.
  if exists (
    select 1
    from public.event_attendees ea
    where ea.event_id = target_event_id
      and ea.user_id = me
  ) then
    return;
  end if;

  -- Re-count with a lock on the attendee rows for safe capacity check.
  select count(*)::int into attendee_count
  from public.event_attendees ea
  where ea.event_id = target_event_id
  for share;

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

revoke all on function public.join_event_with_capacity(uuid) from public;
grant execute on function public.join_event_with_capacity(uuid) to authenticated;
