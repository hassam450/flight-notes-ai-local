-- Task 4.4 - AI configuration key-value store and context documents

-- Generic AI config table (system prompts, model settings, etc.)
create table if not exists public.ai_config (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  config_value text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at trigger
create or replace function public.set_ai_config_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_config_updated_at on public.ai_config;
create trigger trg_ai_config_updated_at
  before update on public.ai_config
  for each row
  execute function public.set_ai_config_updated_at();

alter table public.ai_config enable row level security;

-- Edge functions can read config via service role; no public access needed
drop policy if exists "ai_config_service_select" on public.ai_config;
create policy "ai_config_service_select"
on public.ai_config for select
to authenticated
using (true);

-- Context documents uploaded for AI features
create table if not exists public.ai_context_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  file_size_bytes integer,
  config_key text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_context_documents_config_key_idx
  on public.ai_context_documents(config_key, is_active);

create or replace function public.set_ai_context_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ai_context_documents_updated_at on public.ai_context_documents;
create trigger trg_ai_context_documents_updated_at
  before update on public.ai_context_documents
  for each row
  execute function public.set_ai_context_documents_updated_at();

alter table public.ai_context_documents enable row level security;

drop policy if exists "ai_context_documents_select" on public.ai_context_documents;
create policy "ai_context_documents_select"
on public.ai_context_documents for select
to authenticated
using (true);

-- Storage bucket for context documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ai-context-docs',
  'ai-context-docs',
  true,
  52428800, -- 50MB
  array['application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do nothing;

drop policy if exists "ai_context_docs_public_read" on storage.objects;
create policy "ai_context_docs_public_read"
on storage.objects for select
to public
using (bucket_id = 'ai-context-docs');

drop policy if exists "ai_context_docs_admin_insert" on storage.objects;
create policy "ai_context_docs_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'ai-context-docs');

drop policy if exists "ai_context_docs_admin_update" on storage.objects;
create policy "ai_context_docs_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'ai-context-docs');

drop policy if exists "ai_context_docs_admin_delete" on storage.objects;
create policy "ai_context_docs_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'ai-context-docs');
