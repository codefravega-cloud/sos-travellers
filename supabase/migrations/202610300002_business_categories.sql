-- One list of categories for companies and their services, kept in the database so a new one needs no release.
-- A company can propose a category; it stays "Otra" until the admin approves the proposal. Companies also get a point
-- on the map, so travellers can sort services by distance.

create table if not exists public.business_categories (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  names jsonb not null check (jsonb_typeof(names) = 'object' and char_length(coalesce(names->>'es', '')) between 2 and 60),
  -- The fixed kind this category maps to: the site still lists radio taxis by partners.kind.
  partner_kind text not null default 'other' check (partner_kind in ('radio_taxi','venue','tour','other')),
  status text not null default 'published' check (status in ('published','pending','rejected')),
  proposed_by uuid references auth.users (id) on delete set null,
  rank integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.business_categories enable row level security;
revoke all on public.business_categories from anon, authenticated;
grant select, insert, update, delete on public.business_categories to service_role;

insert into public.business_categories (id, names, partner_kind, rank) values
  ('coffee', '{"es":"Cafeterías","en":"Coffee shops","pt":"Cafeterias","fr":"Cafés"}', 'venue', 140),
  ('food', '{"es":"Comida","en":"Food","pt":"Comida","fr":"Restauration"}', 'venue', 130),
  ('stay', '{"es":"Alojamiento","en":"Stays","pt":"Hospedagem","fr":"Hébergement"}', 'venue', 120),
  ('tour', '{"es":"Tours","en":"Tours","pt":"Passeios","fr":"Excursions"}', 'tour', 110),
  ('guide', '{"es":"Guías","en":"Guides","pt":"Guias","fr":"Guides"}', 'tour', 100),
  ('experience', '{"es":"Experiencias","en":"Experiences","pt":"Experiências","fr":"Expériences"}', 'tour', 90),
  ('adventure', '{"es":"Aventura","en":"Adventure","pt":"Aventura","fr":"Aventure"}', 'tour', 80),
  ('transfer', '{"es":"Traslados","en":"Transfers","pt":"Traslados","fr":"Transferts"}', 'other', 70),
  ('taxi', '{"es":"Radio taxis","en":"Radio taxis","pt":"Rádio táxis","fr":"Radio-taxis"}', 'radio_taxi', 60),
  ('car-rental', '{"es":"Arriendo de autos","en":"Car rental","pt":"Aluguel de carros","fr":"Location de voitures"}', 'other', 50),
  ('shop', '{"es":"Comercio","en":"Shops","pt":"Comércio","fr":"Commerces"}', 'venue', 40),
  ('nightlife', '{"es":"Vida nocturna","en":"Nightlife","pt":"Vida noturna","fr":"Vie nocturne"}', 'venue', 30),
  ('wellness', '{"es":"Bienestar","en":"Wellness","pt":"Bem-estar","fr":"Bien-être"}', 'venue', 20),
  ('other', '{"es":"Otros","en":"Other","pt":"Outros","fr":"Autres"}', 'other', 0)
on conflict (id) do nothing;

alter table public.services drop constraint if exists services_category_check;
alter table public.services add constraint services_category_fkey foreign key (category) references public.business_categories (id);

alter table public.partners
  add column if not exists category_id text not null default 'other' references public.business_categories (id),
  add column if not exists proposed_category_id text references public.business_categories (id) on delete set null,
  add column if not exists lat double precision check (lat between -57 and -17),
  add column if not exists lng double precision check (lng between -110 and -66);

alter table public.company_prospects
  add column if not exists category_id text not null default 'other' references public.business_categories (id),
  add column if not exists proposed_category_id text references public.business_categories (id) on delete set null,
  add column if not exists lat double precision check (lat between -57 and -17),
  add column if not exists lng double precision check (lng between -110 and -66);

update public.partners set category_id = case kind when 'tour' then 'tour' when 'radio_taxi' then 'taxi' else 'other' end where category_id = 'other';
update public.company_prospects set category_id = case kind when 'tour' then 'tour' when 'radio_taxi' then 'taxi' else 'other' end where category_id = 'other';

create index if not exists business_categories_pending_idx on public.business_categories (status) where status = 'pending';

comment on table public.business_categories is 'Categorías de empresas y servicios. Una propuesta queda pendiente hasta que el admin la aprueba.';
