drop policy if exists agendas_delete on public.agendas;
create policy agendas_delete on public.agendas
  for delete to authenticated
  using (has_role('admin'::app_role));
