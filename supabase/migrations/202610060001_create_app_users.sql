-- Accounts of the mobile app (sos-travels-app). Unlike every other table, this one is read and edited
-- by the signed-in user directly with the publishable key, so its policies are what protect it.
create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 2 and 60),
  country text not null check (char_length(country) between 2 and 80),
  preferred_language text not null default 'es' check (preferred_language in ('es','en','pt','fr')),
  preferred_currency text not null default 'CLP' check (preferred_currency in ('CLP','ARS','BRL','USD','EUR','PEN','COP','UYU','GBP','CAD','MXN','AUD')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

create policy "app_users_select_own" on public.app_users for select to authenticated using ((select auth.uid()) = id);
create policy "app_users_update_own" on public.app_users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.app_users from anon, authenticated;
grant select on public.app_users to authenticated;
grant update (first_name, country, preferred_language, preferred_currency, updated_at) on public.app_users to authenticated;
grant select, insert, update, delete on public.app_users to service_role;

-- The row is created with the account, from the data sent at sign-up. Values are cleaned here because
-- that data comes straight from the client; consent_at is the server time, not the client's.
create or replace function public.handle_new_app_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first_name text := left(btrim(coalesce(meta->>'first_name', '')), 60);
  country text := left(btrim(coalesce(meta->>'country', '')), 80);
  language text := meta->>'preferred_language';
  currency text := meta->>'preferred_currency';
begin
  insert into public.app_users (id, first_name, country, preferred_language, preferred_currency)
  values (
    new.id,
    case when char_length(first_name) >= 2 then first_name else 'Viajero' end,
    case when char_length(country) >= 2 then country else 'Sin informar' end,
    case when language in ('es','en','pt','fr') then language else 'es' end,
    case when currency in ('CLP','ARS','BRL','USD','EUR','PEN','COP','UYU','GBP','CAD','MXN','AUD') then currency else 'CLP' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_app_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_app_user on auth.users;
create trigger on_auth_user_created_app_user after insert on auth.users
  for each row execute function public.handle_new_app_user();

comment on table public.app_users is 'Perfil de las cuentas de la app móvil. Cada usuario ve y edita solo su fila; se crea por trigger al registrarse y se borra con la cuenta.';
