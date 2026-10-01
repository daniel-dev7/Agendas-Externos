alter table public.appointments
  add column if not exists slot_number integer;

update public.appointments a
set slot_number = ranked.slot_number
from (
  select id,
         row_number() over (
           partition by agenda_id
           order by slot_time nulls last, created_at, id
         )::integer as slot_number
  from public.appointments
  where slot_number is null
    and status <> 'cancelled'
) ranked
where a.id = ranked.id
  and a.slot_number is null;

create unique index if not exists appointments_agenda_slot_unique
  on public.appointments(agenda_id, slot_number)
  where slot_number is not null and status <> 'cancelled';

alter table public.appointments
  add constraint appointments_slot_number_positive
  check (slot_number is null or slot_number > 0);
