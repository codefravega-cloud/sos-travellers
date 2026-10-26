-- The boss panel can now delete reviews and business applications for good (api/_routes/admin.ts, action "delete").
-- Until now the server could only hide or reject them. Each deletion is written to tbl_auditoria with its reason.
grant delete on public.reviews to service_role;
grant delete on public.business_applications to service_role;
