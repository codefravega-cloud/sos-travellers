-- Order within a region for places without ratings: higher `rank` first (see scripts/places/osm.mjs).
alter table public.places add column rank smallint not null default 0;
