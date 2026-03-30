-- Grupply V1 schema (multi-tenant) for Supabase Postgres
-- Note: RLS policies are added in a separate migration.

create extension if not exists "pgcrypto";

-- ---------- utilities ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- organizations ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);

-- ---------- profiles ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  app_role text not null default 'user' check (app_role in ('user', 'admin')),
  first_name text not null,
  last_name text not null,
  avatar_url text,
  biography text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(biography, '')
    )
  ) stored
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create index if not exists profiles_org_id_idx on public.profiles(organization_id);
create index if not exists profiles_search_gin on public.profiles using gin (search);

-- ---------- hobbies ----------
create table if not exists public.hobbies (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table if not exists public.user_hobbies (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hobby_id bigint not null references public.hobbies(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, hobby_id)
);

create index if not exists user_hobbies_user_id_idx on public.user_hobbies(user_id);
create index if not exists user_hobbies_hobby_id_idx on public.user_hobbies(hobby_id);

-- ---------- events ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  date_time timestamptz not null,
  location text,
  capacity int not null check (capacity > 0),
  status text not null default 'active' check (status in ('active', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(location, '')
    )
  ) stored
);

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create index if not exists events_org_id_date_time_idx
  on public.events(organization_id, date_time);
create index if not exists events_creator_id_idx
  on public.events(creator_id);
create index if not exists events_search_gin
  on public.events using gin (search);

create table if not exists public.event_attendees (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_attendees_event_id_idx on public.event_attendees(event_id);
create index if not exists event_attendees_user_id_idx on public.event_attendees(user_id);

-- ---------- notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);
create index if not exists notifications_org_id_idx
  on public.notifications(organization_id);

-- ---------- connections (undirected within org) ----------
create table if not exists public.user_connections (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references auth.users(id) on delete cascade,
  user_low uuid generated always as (least(user_id, connection_id)) stored,
  user_high uuid generated always as (greatest(user_id, connection_id)) stored,
  created_at timestamptz not null default now(),
  constraint user_connections_not_self check (user_id <> connection_id),
  primary key (organization_id, user_id, connection_id)
);

create unique index if not exists user_connections_undirected_unique
  on public.user_connections(organization_id, user_low, user_high);

create index if not exists user_connections_user_id_idx
  on public.user_connections(user_id);

-- ---------- messaging (basic 1:1) ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists conversations_org_id_created_at_idx
  on public.conversations(organization_id, created_at desc);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_participants_user_id_idx
  on public.conversation_participants(user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_created_at_idx
  on public.messages(conversation_id, created_at);
create index if not exists messages_sender_id_idx
  on public.messages(sender_id);

-- ---------- audit logs ----------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_at_idx
  on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_user_created_at_idx
  on public.audit_logs(user_id, created_at desc);

