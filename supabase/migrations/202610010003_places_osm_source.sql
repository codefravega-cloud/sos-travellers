-- Places can also come from OpenStreetMap, which has no ratings: `source` tells them apart
-- and exempts them from the Google quality bar. `osm_id` ("node/123") is their stable key.
alter table public.places
  add column source text not null default 'google' check (source in ('google', 'osm', 'curated')),
  add column osm_id text unique;

alter table public.places drop constraint places_quality;
alter table public.places
  add constraint places_quality check (curated or source = 'osm' or (rating >= 4.0 and review_count is not null));
