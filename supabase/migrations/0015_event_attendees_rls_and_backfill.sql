-- Align event_attendees.organization_id with events (fixes RLS hiding rows).
-- Backfill creators who never got an attendee row (silent insert failures).
-- RLS: visibility and delete follow the *event's* org so denormalized ea.organization_id
-- cannot hide legitimate rows from org members.

update public.event_attendees ea
set organization_id = e.organization_id
from public.events e
where ea.event_id = e.id
  and ea.organization_id is distinct from e.organization_id;

insert into public.event_attendees (organization_id, event_id, user_id)
select e.organization_id, e.id, e.creator_id
from public.events e
where not exists (
  select 1
  from public.event_attendees ea
  where ea.event_id = e.id
    and ea.user_id = e.creator_id
)
on conflict (event_id, user_id) do nothing;

drop policy if exists event_attendees_select_same_org on public.event_attendees;
drop policy if exists event_attendees_insert_self on public.event_attendees;
drop policy if exists event_attendees_delete_self on public.event_attendees;

create policy event_attendees_select_via_event_org
on public.event_attendees
for select
using (
  exists (
    select 1
    from public.events e
    where e.id = event_attendees.event_id
      and public.is_org_member(e.organization_id)
  )
);

create policy event_attendees_insert_self
on public.event_attendees
for insert
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
  and organization_id = (
    select ev.organization_id
    from public.events ev
    where ev.id = event_id
  )
);

create policy event_attendees_delete_self
on public.event_attendees
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    where e.id = event_attendees.event_id
      and public.is_org_member(e.organization_id)
  )
);
