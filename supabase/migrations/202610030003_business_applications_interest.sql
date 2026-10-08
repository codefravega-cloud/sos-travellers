alter table public.business_applications
  add column if not exists interest text not null default 'listing'
  check (interest in ('listing','partner','event','guides'));
