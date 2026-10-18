-- Specialty coffee shops are an editorial subset of the 'coffee' category (see scripts/places/specialty.mjs).
alter table public.places add column specialty boolean not null default false;
