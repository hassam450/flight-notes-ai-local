-- Task 5.1 - Aviation chatbot persistence layer

create table if not exists public.aviation_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'PPL',
  source_mode text not null default 'general' check (source_mode in ('general', 'notes_ai')),
  target_category text,
  last_message_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aviation_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.aviation_chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  token_usage jsonb,
  context_meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists aviation_chat_threads_user_last_idx
  on public.aviation_chat_threads(user_id, last_message_at desc);

create index if not exists aviation_chat_messages_thread_created_idx
  on public.aviation_chat_messages(thread_id, created_at asc);

create index if not exists aviation_chat_messages_user_created_idx
  on public.aviation_chat_messages(user_id, created_at desc);

create or replace function public.set_aviation_chat_thread_timestamps()
returns trigger
language plpgsql
as $$
begin
  update public.aviation_chat_threads
  set updated_at = now(),
      last_message_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists trg_aviation_chat_messages_after_insert on public.aviation_chat_messages;
create trigger trg_aviation_chat_messages_after_insert
  after insert on public.aviation_chat_messages
  for each row
  execute function public.set_aviation_chat_thread_timestamps();

alter table public.aviation_chat_threads enable row level security;
alter table public.aviation_chat_messages enable row level security;

drop policy if exists "aviation_chat_threads_select_own" on public.aviation_chat_threads;
create policy "aviation_chat_threads_select_own"
on public.aviation_chat_threads for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "aviation_chat_threads_insert_own" on public.aviation_chat_threads;
create policy "aviation_chat_threads_insert_own"
on public.aviation_chat_threads for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "aviation_chat_threads_update_own" on public.aviation_chat_threads;
create policy "aviation_chat_threads_update_own"
on public.aviation_chat_threads for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "aviation_chat_threads_delete_own" on public.aviation_chat_threads;
create policy "aviation_chat_threads_delete_own"
on public.aviation_chat_threads for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "aviation_chat_messages_select_own" on public.aviation_chat_messages;
create policy "aviation_chat_messages_select_own"
on public.aviation_chat_messages for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "aviation_chat_messages_insert_own" on public.aviation_chat_messages;
create policy "aviation_chat_messages_insert_own"
on public.aviation_chat_messages for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "aviation_chat_messages_update_own" on public.aviation_chat_messages;
create policy "aviation_chat_messages_update_own"
on public.aviation_chat_messages for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "aviation_chat_messages_delete_own" on public.aviation_chat_messages;
create policy "aviation_chat_messages_delete_own"
on public.aviation_chat_messages for delete
to authenticated
using (auth.uid() = user_id);
