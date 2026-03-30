-- Grupply V1 RLS policies

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.hobbies enable row level security;
alter table public.user_hobbies enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.notifications enable row level security;
alter table public.user_connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- helper predicates ----------
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.member_role in ('admin', 'owner')
  );
$$;

-- ---------- organizations ----------
-- Members can read their org; only admins/owners can update; creation handled by service/admin tooling.
create policy organizations_select_member
on public.organizations
for select
using (public.is_org_member(id));

create policy organizations_insert_authenticated
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

create policy organizations_update_admin
on public.organizations
for update
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- ---------- organization_members ----------
create policy organization_members_select_self_org
on public.organization_members
for select
using (public.is_org_member(organization_id));

create policy organization_members_insert_admin
on public.organization_members
for insert
with check (public.is_org_admin(organization_id));

-- Allow org creator to add themselves as the owner (bootstrap flow).
create policy organization_members_insert_creator_owner
on public.organization_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and member_role = 'owner'
  and exists (
    select 1
    from public.organizations o
    where o.id = organization_id
      and o.created_by = auth.uid()
  )
);

create policy organization_members_update_admin
on public.organization_members
for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy organization_members_delete_admin
on public.organization_members
for delete
using (public.is_org_admin(organization_id));

-- ---------- profiles ----------
-- Anyone in the same org can see basic profile info.
create policy profiles_select_same_org
on public.profiles
for select
using (public.is_org_member(organization_id));

-- Users can insert/update their own profile only, inside their org membership.
create policy profiles_insert_self
on public.profiles
for insert
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy profiles_update_self
on public.profiles
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

-- ---------- hobbies ----------
-- Readable by any authenticated user (global catalog).
create policy hobbies_select_authenticated
on public.hobbies
for select
to authenticated
using (true);

-- ---------- user_hobbies ----------
create policy user_hobbies_select_same_org
on public.user_hobbies
for select
using (public.is_org_member(organization_id));

create policy user_hobbies_insert_self
on public.user_hobbies
for insert
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy user_hobbies_delete_self
on public.user_hobbies
for delete
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

-- ---------- events ----------
create policy events_select_same_org
on public.events
for select
using (public.is_org_member(organization_id));

create policy events_insert_member
on public.events
for insert
with check (
  creator_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy events_update_creator
on public.events
for update
using (
  creator_id = auth.uid()
  and public.is_org_member(organization_id)
)
with check (
  creator_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy events_delete_creator
on public.events
for delete
using (
  creator_id = auth.uid()
  and public.is_org_member(organization_id)
);

-- ---------- event_attendees ----------
create policy event_attendees_select_same_org
on public.event_attendees
for select
using (public.is_org_member(organization_id));

create policy event_attendees_insert_self
on public.event_attendees
for insert
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy event_attendees_delete_self
on public.event_attendees
for delete
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

-- ---------- notifications ----------
create policy notifications_select_self
on public.notifications
for select
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

create policy notifications_update_self
on public.notifications
for update
using (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
)
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

-- Inserts typically happen from server-side logic; allow org admins to insert.
create policy notifications_insert_admin
on public.notifications
for insert
with check (
  public.is_org_admin(organization_id)
);

-- ---------- connections ----------
create policy user_connections_select_same_org
on public.user_connections
for select
using (public.is_org_member(organization_id));

create policy user_connections_insert_self
on public.user_connections
for insert
with check (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or connection_id = auth.uid())
);

create policy user_connections_delete_self
on public.user_connections
for delete
using (
  public.is_org_member(organization_id)
  and (user_id = auth.uid() or connection_id = auth.uid())
);

-- ---------- conversations & messaging ----------
create policy conversations_select_participant
on public.conversations
for select
using (
  public.is_org_member(organization_id)
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = id
      and cp.user_id = auth.uid()
  )
);

create policy conversations_insert_member
on public.conversations
for insert
with check (
  created_by = auth.uid()
  and public.is_org_member(organization_id)
);

create policy conversation_participants_select_participant
on public.conversation_participants
for select
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
  )
);

create policy conversation_participants_insert_creator
on public.conversation_participants
for insert
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.created_by = auth.uid()
  )
);

create policy messages_select_participant
on public.messages
for select
using (
  public.is_org_member(organization_id)
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
  )
);

create policy messages_insert_sender_participant
on public.messages
for insert
with check (
  sender_id = auth.uid()
  and public.is_org_member(organization_id)
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_id
      and cp.user_id = auth.uid()
  )
);

-- ---------- audit logs ----------
-- Only org admins can read audit logs.
create policy audit_logs_select_admin
on public.audit_logs
for select
using (public.is_org_admin(organization_id));

-- Any org member can write their own audit events.
create policy audit_logs_insert_member_self
on public.audit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_org_member(organization_id)
);

