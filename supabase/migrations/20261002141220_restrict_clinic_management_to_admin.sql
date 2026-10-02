-- Clinic administration is an administrator-only capability.
drop policy if exists clinics_insert on public.clinics;
create policy clinics_insert_admin
on public.clinics
for insert
to authenticated
with check (private.has_permission('clinic_manage') and private.has_role('admin'::public.app_role));

drop policy if exists clinics_update on public.clinics;
create policy clinics_update_admin
on public.clinics
for update
to authenticated
using (private.has_permission('clinic_manage') and private.has_role('admin'::public.app_role))
with check (private.has_permission('clinic_manage') and private.has_role('admin'::public.app_role));