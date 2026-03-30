-- App code expects connection *requests* with id, requester_id, responder_id, status.
-- Replace legacy undirected (user_id, connection_id) shape.

drop policy if exists user_connections_select_same_org on public.user_connections;
drop policy if exists user_connections_insert_self on public.user_connections;
drop policy if exists user_connections_delete_self on public.user_connections;

drop table if exists public.user_connections;

create table public.user_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  responder_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint user_connections_not_self check (requester_id <> responder_id),
  user_low uuid generated always as (least(requester_id, responder_id)) stored,
  user_high uuid generated always as (greatest(requester_id, responder_id)) stored,
  constraint user_connections_pair_unique unique (organization_id, user_low, user_high)
);

create index user_connections_org_idx on public.user_connections(organization_id);
create index user_connections_requester_idx on public.user_connections(requester_id);
create index user_connections_responder_idx on public.user_connections(responder_id);

alter table public.user_connections enable row level security;

create policy user_connections_select_same_org
on public.user_connections
for select
using (public.is_org_member(organization_id));

create policy user_connections_insert_as_requester
on public.user_connections
for insert
with check (
  public.is_org_member(organization_id)
  and requester_id = auth.uid()
  and exists (
    select 1
    from public.profiles pr
    where pr.user_id = responder_id
      and pr.organization_id = organization_id
  )
);

create policy user_connections_update_responder
on public.user_connections
for update
using (
  public.is_org_member(organization_id)
  and responder_id = auth.uid()
  and status = 'pending'
)
with check (
  public.is_org_member(organization_id)
  and responder_id = auth.uid()
  and status in ('accepted', 'declined')
);

create policy user_connections_update_requester_withdraw
on public.user_connections
for update
using (
  public.is_org_member(organization_id)
  and requester_id = auth.uid()
  and status = 'pending'
)
with check (
  public.is_org_member(organization_id)
  and requester_id = auth.uid()
  and status = 'declined'
);

-- After a decline, the same pair can send a new request (new requester / pending).
create policy user_connections_update_new_request_after_declined
on public.user_connections
for update
using (
  public.is_org_member(organization_id)
  and status = 'declined'
  and (requester_id = auth.uid() or responder_id = auth.uid())
)
with check (
  public.is_org_member(organization_id)
  and status = 'pending'
  and requester_id = auth.uid()
  and exists (
    select 1
    from public.profiles pr
    where pr.user_id = responder_id
      and pr.organization_id = organization_id
  )
);

create policy user_connections_delete_participant
on public.user_connections
for delete
using (
  public.is_org_member(organization_id)
  and (requester_id = auth.uid() or responder_id = auth.uid())
);

-- Suggested matches: exclude colleagues you already have a pending or accepted request with.
create or replace function public.suggested_matches(p_user_id uuid, p_limit int default 20)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  shared_interests bigint
)
language sql
stable
as $$
  with me as (
    select p.organization_id
    from public.profiles p
    where p.user_id = p_user_id
  ),
  my_hobbies as (
    select uh.hobby_id
    from public.user_hobbies uh
    join me on me.organization_id = uh.organization_id
    where uh.user_id = p_user_id
  ),
  connected as (
    select
      least(uc.requester_id, uc.responder_id) as a,
      greatest(uc.requester_id, uc.responder_id) as b
    from public.user_connections uc
    join me on me.organization_id = uc.organization_id
    where (uc.requester_id = p_user_id or uc.responder_id = p_user_id)
      and uc.status in ('pending', 'accepted')
  )
  select
    p.user_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    count(uh.hobby_id) as shared_interests
  from public.profiles p
  join me on me.organization_id = p.organization_id
  join public.user_hobbies uh
    on uh.user_id = p.user_id
   and uh.organization_id = p.organization_id
  where p.user_id <> p_user_id
    and uh.hobby_id in (select hobby_id from my_hobbies)
    and not exists (
      select 1
      from connected c
      where (c.a = least(p_user_id, p.user_id) and c.b = greatest(p_user_id, p.user_id))
    )
  group by p.user_id, p.first_name, p.last_name, p.avatar_url
  order by shared_interests desc, p.last_name asc, p.first_name asc
  limit greatest(1, p_limit);
$$;

-- GDPR: new column names
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
  delete from public.user_connections
  where requester_id = uid or responder_id = uid;
  delete from public.event_attendees where user_id = uid;
  delete from public.user_hobbies where user_id = uid;
  delete from public.notifications where user_id = uid;
  delete from public.audit_logs where user_id = uid;
  delete from public.profiles where user_id = uid;
  delete from public.organization_members where user_id = uid;
end;
$$;

revoke all on function public.delete_my_data() from public;
grant execute on function public.delete_my_data() to authenticated;
