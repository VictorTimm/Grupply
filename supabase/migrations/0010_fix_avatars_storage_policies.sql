-- Fix avatar Storage RLS policies: use flat key (name = userId) instead of folder-based check.
-- Includes SELECT policy required for upsert and public read access.

drop policy if exists avatars_select_public on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

create policy avatars_select_public
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy avatars_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name = auth.uid()::text
);

create policy avatars_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name = auth.uid()::text
);

create policy avatars_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name = auth.uid()::text
);
