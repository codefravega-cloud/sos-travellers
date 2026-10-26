-- SOS Travellers has exactly one admin account, which controls the whole app. The database refuses a second one,
-- whoever tries (the panel, the API or SQL). The first admin is set by hand in the SQL editor:
--   update public.tbl_usuarios set tipo_cuenta = 'admin' where id = (select id from auth.users where email = '<correo>');
-- To hand the role to another account, first turn the current admin into 'cliente' in the same transaction.
create unique index if not exists tbl_usuarios_un_solo_admin on public.tbl_usuarios ((true)) where tipo_cuenta = 'admin';
