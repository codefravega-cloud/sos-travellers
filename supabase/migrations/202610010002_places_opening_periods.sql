-- Weekly opening periods as [open, close] pairs in minutes since Sunday 00:00 (local time of the place).
-- The site computes "open now" from them in the browser; `hours` stays as the display text.
alter table public.places
  add column opening_periods jsonb check (opening_periods is null or jsonb_typeof(opening_periods) = 'array');
