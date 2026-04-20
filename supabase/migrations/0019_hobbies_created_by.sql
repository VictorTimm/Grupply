alter table public.hobbies
add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists hobbies_created_by_idx on public.hobbies(created_by);

drop policy if exists hobbies_insert_authenticated on public.hobbies;

create policy hobbies_insert_authenticated
on public.hobbies
for insert
to authenticated
with check (created_by = auth.uid());

create policy hobbies_delete_own_custom
on public.hobbies
for delete
to authenticated
using (created_by = auth.uid());
