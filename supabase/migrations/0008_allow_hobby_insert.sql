-- Allow authenticated users to add custom hobbies to the global catalog.
-- The unique constraint on hobbies.name prevents duplicates.

create policy hobbies_insert_authenticated
on public.hobbies
for insert
to authenticated
with check (true);
