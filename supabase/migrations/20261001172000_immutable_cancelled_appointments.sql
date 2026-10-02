create or replace function public.prevent_cancelled_appointment_reactivation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'cancelled'::public.appointment_status
     and (
       new.status is distinct from old.status
       or new.patient_id is distinct from old.patient_id
       or new.patient_name is distinct from old.patient_name
       or new.patient_code is distinct from old.patient_code
       or new.agenda_id is distinct from old.agenda_id
       or new.slot_number is distinct from old.slot_number
       or new.slot_time is distinct from old.slot_time
       or new.notes is distinct from old.notes
     ) then
    raise exception 'Agendamento cancelado é definitivo e não pode ser reativado ou alterado.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_cancelled_appointment_reactivation on public.appointments;
create trigger prevent_cancelled_appointment_reactivation
before update on public.appointments
for each row execute function public.prevent_cancelled_appointment_reactivation();

grant execute on function public.prevent_cancelled_appointment_reactivation() to authenticated;

create unique index if not exists appointments_one_active_per_slot
on public.appointments (agenda_id, slot_number)
where slot_number is not null and status <> 'cancelled'::public.appointment_status;
