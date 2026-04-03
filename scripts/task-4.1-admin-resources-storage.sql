-- Task 4.1 - Supabase Storage bucket for admin resource uploads

-- Create storage bucket for aviation resource files (PDFs and thumbnails)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aviation-resources',
  'aviation-resources',
  true,
  104857600, -- 100MB limit for large FAA PDFs
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Allow public read access to uploaded resources
drop policy if exists "aviation_resources_storage_public_read" on storage.objects;
create policy "aviation_resources_storage_public_read"
on storage.objects for select
to public
using (bucket_id = 'aviation-resources');

-- Allow authenticated users (admins) to upload/update/delete files
drop policy if exists "aviation_resources_storage_admin_insert" on storage.objects;
create policy "aviation_resources_storage_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'aviation-resources');

drop policy if exists "aviation_resources_storage_admin_update" on storage.objects;
create policy "aviation_resources_storage_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'aviation-resources');

drop policy if exists "aviation_resources_storage_admin_delete" on storage.objects;
create policy "aviation_resources_storage_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'aviation-resources');
