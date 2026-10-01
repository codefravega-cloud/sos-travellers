create table if not exists public.places (
  id text primary key check (id ~ '^[a-z0-9-]{2,64}$'),
  google_place_id text unique,
  name text not null check (char_length(name) between 2 and 160),
  category text not null check (category in ('museum','coffee','food','view','stay','useful','market','shop','experience','growshop','park','themed','winery','snow','nightlife')),
  rating numeric(2,1) check (rating between 1 and 5),
  rating_label text,
  review_count integer check (review_count >= 0),
  lat double precision not null check (lat between -57 and -17),
  lng double precision not null check (lng between -110 and -66),
  region text not null check (region in ('AP','TA','AN','AT','CO','VS','RM','LI','ML','NB','BI','AR','LR','LL','AI','MA')),
  comuna text,
  locality text not null,
  address text,
  hours text,
  visit text,
  website text,
  google_maps_url text,
  map_query text,
  languages text[],
  summary jsonb,
  tag jsonb,
  access jsonb,
  photo jsonb,
  curated boolean not null default false,
  status text not null default 'published' check (status in ('published','hidden')),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Imported places must meet the quality bar; hand-curated ones may be unrated (e.g. free parks).
  constraint places_quality check (curated or (rating >= 4.0 and review_count is not null))
);

create index if not exists places_region_idx on public.places (region) where status = 'published';
create index if not exists places_region_category_idx on public.places (region, category) where status = 'published';

alter table public.places enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on table public.places to service_role;

comment on table public.places is 'Lugares turísticos de Chile. Los importados provienen de Google Places (nota >= 4.0); checked_at indica la última verificación.';
