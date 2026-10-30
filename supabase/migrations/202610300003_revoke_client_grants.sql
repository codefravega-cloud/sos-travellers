-- Row level security already refuses these tables to the browser and the app, which reach them only through the API.
-- Removing the default grants as well means a mistake in one policy can no longer expose a table.
-- tbl_usuarios and app_users keep their own-row access (202610220001_tbl_usuarios.sql).
revoke all on public.agent_runs, public.business_applications, public.events, public.guide_leads, public.owner_benefits,
  public.partners, public.places, public.promotions, public.reviews, public.services, public.suggestions,
  public.traveller_preferences, public.traveller_profiles
from anon, authenticated;
