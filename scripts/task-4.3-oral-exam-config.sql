-- Task 4.3 - Oral exam scenarios and AI config version history

-- Oral exam scenarios
create table if not exists public.oral_exam_scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null check (category in ('PPL', 'Instrument', 'Commercial', 'Multi-Engine', 'CFI')),
  topic text,
  persona_prompt text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oral_exam_scenarios_category_idx
  on public.oral_exam_scenarios(category, is_active);

create or replace function public.set_oral_exam_scenarios_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_oral_exam_scenarios_updated_at on public.oral_exam_scenarios;
create trigger trg_oral_exam_scenarios_updated_at
  before update on public.oral_exam_scenarios
  for each row
  execute function public.set_oral_exam_scenarios_updated_at();

alter table public.oral_exam_scenarios enable row level security;

drop policy if exists "oral_exam_scenarios_select" on public.oral_exam_scenarios;
create policy "oral_exam_scenarios_select"
on public.oral_exam_scenarios for select
to authenticated
using (is_active = true);

-- AI config version history (tracks prompt changes for audit trail)
create table if not exists public.ai_config_history (
  id uuid primary key default gen_random_uuid(),
  config_key text not null,
  config_value text not null,
  changed_by text,
  created_at timestamptz not null default now()
);

create index if not exists ai_config_history_key_idx
  on public.ai_config_history(config_key, created_at desc);

alter table public.ai_config_history enable row level security;

drop policy if exists "ai_config_history_select" on public.ai_config_history;
create policy "ai_config_history_select"
on public.ai_config_history for select
to authenticated
using (true);
