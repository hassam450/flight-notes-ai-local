-- Task 5.2 - FAA resource library and PDF viewer catalog

create table if not exists public.aviation_resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('handbooks', 'regulations', 'standards', 'advisory')),
  document_code text,
  description text not null,
  pdf_url text not null,
  thumbnail_url text,
  keywords text[] not null default '{}',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists aviation_resources_active_sort_idx
  on public.aviation_resources(is_active, is_featured desc, sort_order asc, title asc);

create or replace function public.set_aviation_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_aviation_resources_updated_at on public.aviation_resources;
create trigger trg_aviation_resources_updated_at
  before update on public.aviation_resources
  for each row
  execute function public.set_aviation_resources_updated_at();

alter table public.aviation_resources enable row level security;

drop policy if exists "aviation_resources_select_active" on public.aviation_resources;
create policy "aviation_resources_select_active"
on public.aviation_resources for select
to authenticated
using (is_active = true);

insert into public.aviation_resources (
  slug,
  title,
  category,
  document_code,
  description,
  pdf_url,
  keywords,
  is_featured,
  sort_order
)
values
  (
    'pilot-handbook-of-aeronautical-knowledge',
    'Pilot''s Handbook of Aeronautical Knowledge',
    'handbooks',
    'FAA-H-8083-25C',
    'Core FAA handbook covering fundamentals of flight, weather, aircraft systems, airspace, and aeromedical factors.',
    'https://www.faa.gov/sites/faa.gov/files/FAA-H-8083-25C.pdf',
    array['ppl', 'fundamentals', 'airspace', 'weather', 'aircraft systems'],
    true,
    10
  ),
  (
    'airplane-flying-handbook',
    'Airplane Flying Handbook',
    'handbooks',
    'FAA-H-8083-3C',
    'FAA procedures reference for maneuvers, takeoffs, landings, performance operations, and risk management.',
    'https://www.faa.gov/sites/faa.gov/files/FAA-H-8083-3C.pdf',
    array['maneuvers', 'landings', 'takeoffs', 'performance', 'training'],
    true,
    20
  ),
  (
    'aviation-weather-handbook',
    'Aviation Weather Handbook',
    'handbooks',
    'FAA-H-8083-28A',
    'FAA weather reference for atmospheric theory, observations, forecasts, icing, turbulence, and weather products.',
    'https://www.faa.gov/sites/faa.gov/files/FAA-H-8083-28A_FAA_Web.pdf',
    array['weather', 'metar', 'taf', 'icing', 'turbulence'],
    true,
    30
  ),
  (
    'instrument-procedures-handbook',
    'Instrument Procedures Handbook',
    'standards',
    'FAA-H-8083-16B',
    'FAA guidance on IFR departure, en route, arrival, approach, and systems procedures.',
    'https://www.faa.gov/sites/faa.gov/files/FAA-H-8083-16B.pdf',
    array['ifr', 'instrument', 'approach', 'departure', 'navigation'],
    false,
    40
  ),
  (
    'aeronautical-information-manual',
    'Aeronautical Information Manual (AIM)',
    'regulations',
    'AIM',
    'FAA operational guidance and procedures used for navigation, ATC, airspace, and pilot operating practices.',
    'https://www.faa.gov/air_traffic/publications/atpubs/aim_html/aim_basic_w_chg_1_and_2/book.pdf',
    array['aim', 'atc', 'airspace', 'procedures', 'regulations'],
    true,
    50
  ),
  (
    'aeronautical-chart-users-guide',
    'Aeronautical Chart Users'' Guide',
    'standards',
    'Chart Users'' Guide',
    'Official FAA guide to symbology, legend interpretation, and chart reading for VFR and IFR products.',
    'https://aeronav.faa.gov/user_guide/20250807/cug-complete.pdf',
    array['charts', 'sectional', 'legend', 'ifr', 'vfr'],
    false,
    60
  ),
  (
    'ac-61-65-certification-pilots-and-instructors',
    'Certification: Pilots and Flight and Ground Instructors',
    'advisory',
    'AC 61-65K',
    'FAA advisory circular on pilot and instructor certification, endorsements, and qualification guidance.',
    'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_61-65K.pdf',
    array['endorsements', 'cfi', 'certification', 'student pilot', 'instructor'],
    false,
    70
  )
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  document_code = excluded.document_code,
  description = excluded.description,
  pdf_url = excluded.pdf_url,
  keywords = excluded.keywords,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
