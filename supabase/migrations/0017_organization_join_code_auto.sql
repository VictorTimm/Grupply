-- Auto-generate join_code on new organizations; backfill existing rows without a code.

create or replace function public.organizations_set_join_code_if_empty()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.join_code is null or length(trim(new.join_code)) = 0 then
    new.join_code := encode(extensions.gen_random_bytes(12), 'hex');
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_join_code_before_insert on public.organizations;

create trigger organizations_join_code_before_insert
before insert on public.organizations
for each row
execute function public.organizations_set_join_code_if_empty();

-- Existing orgs may have NULL join_code; assign one per row for invite-based signup.
update public.organizations
set join_code = encode(extensions.gen_random_bytes(12), 'hex')
where join_code is null
   or length(trim(join_code)) = 0;
