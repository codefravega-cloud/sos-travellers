-- Agents load events as drafts; a person publishes them from the team panel.
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check check (status in ('draft','published','hidden'));

alter table public.events add column if not exists source text;
alter table public.events add column if not exists source_url text;

create unique index if not exists events_region_title_start_key on public.events (region, lower(title), starts_at);
comment on column public.events.source is 'Quién cargó la fila, por ejemplo agent:events. Nulo si fue a mano.';
