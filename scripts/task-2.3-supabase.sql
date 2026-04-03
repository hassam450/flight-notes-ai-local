-- Task 2.3 - Storage bucket and notes metadata table

insert into storage.buckets (id, name, public)
values ('notes-files', 'notes-files', false)
on conflict (id) do nothing;

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null,
  category text not null,
  status text not null,
  duration_sec integer not null default 0,
  mime_type text,
  file_size_bytes bigint,
  local_file_uri text,
  remote_path text,
  upload_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_created_at_idx on public.notes(created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
on public.notes for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "notes_storage_insert_own" on storage.objects;
create policy "notes_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'notes-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "notes_storage_select_own" on storage.objects;
create policy "notes_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'notes-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "notes_storage_update_own" on storage.objects;
create policy "notes_storage_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'notes-files'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "notes_storage_delete_own" on storage.objects;
create policy "notes_storage_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'notes-files'
  and split_part(name, '/', 1) = auth.uid()::text
);
