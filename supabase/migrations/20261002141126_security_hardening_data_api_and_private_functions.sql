-- Security hardening applied to production on 2026-10-02.
-- Keep internal authorization and trigger functions out of the public Data API.

create schema if not exists private;

alter function public.has_permission(text) set schema private;
alter function public.has_role(public.app_role) set schema private;
alter function public.is_admin_or_operator() set schema private;
alter function public.my_clinic_id() set schema private;

alter function public.enforce_clinic_appointment_update() set schema private;
alter function public.prevent_cancelled_appointment_reactivation() set schema private;
alter function public.prevent_operator_appointment_changes() set schema private;
alter function public.set_updated_at() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.rls_auto_enable() set schema private;

grant usage on schema private to authenticated;
grant execute on function private.has_permission(text) to authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.is_admin_or_operator() to authenticated;
grant execute on function private.my_clinic_id() to authenticated;

-- No anonymous access to application tables.
revoke all on table public.agendas from anon;
revoke all on table public.appointments from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.clinics from anon;
revoke all on table public.patients from anon;
revoke all on table public.profiles from anon;

-- RLS must remain the row-level boundary; remove unrelated table privileges.
revoke truncate, references, trigger on table public.agendas from authenticated;
revoke truncate, references, trigger on table public.appointments from authenticated;
revoke truncate, references, trigger on table public.audit_logs from authenticated;
revoke truncate, references, trigger on table public.clinics from authenticated;
revoke truncate, references, trigger on table public.patients from authenticated;
revoke truncate, references, trigger on table public.profiles from authenticated;

-- Appointments are cancelled through status changes; direct deletion is not exposed.
revoke delete on table public.appointments from authenticated;
drop policy if exists appointments_delete on public.appointments;

-- Audit history is internal and may contain sensitive metadata.
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (private.has_role('admin'::public.app_role));

-- Profiles are created by the trusted auth trigger/admin backend, never self-created.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (private.has_role('admin'::public.app_role));

-- Prevent future public-schema objects from becoming accidentally exposed.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon;

revoke execute on all functions in schema public from public, anon, authenticated;
revoke all on schema public from anon;
grant usage on schema public to anon, authenticated;

-- RLS policies need these internal helpers.
grant execute on function private.has_permission(text) to authenticated;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.is_admin_or_operator() to authenticated;
grant execute on function private.my_clinic_id() to authenticated;
