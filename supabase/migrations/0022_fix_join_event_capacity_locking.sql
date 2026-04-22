-- Fix join_event_with_capacity aggregate lock error and keep same-org joining.
--
-- Root cause from runtime logs:
--   "FOR SHARE is not allowed with aggregate functions"
-- The previous function attempted:
--   select count(*) ... for share;
-- which is invalid in Postgres.
--
-- This patch serializes joins per event by locking the event row with FOR UPDATE
-- under SECURITY DEFINER, then performs a regular attendee count.

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

  select p.organization_id into org_id
  from public.profiles p
  where p.user_id = me;

  if org_id is null then
    raise exception 'profile_missing';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = me
  ) then
    raise exception 'not_org_member';
  end if;

  -- Lock event row to serialize concurrent joins for same event.
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

revoke all on function public.join_event_with_capacity(uuid) from public;
grant execute on function public.join_event_with_capacity(uuid) to authenticated;
