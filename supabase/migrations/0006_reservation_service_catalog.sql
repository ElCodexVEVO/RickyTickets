-- El catálogo service_type describe el servicio; sencillo/redondo describe trayectos.
-- Campo opcional, sin alterar reservas anteriores. Aplicar después de 0005.
begin;
alter table public.reservations add column service_catalog_item_id uuid references public.service_catalog_items(id);
alter function public.create_reservation(jsonb) rename to create_reservation_base;
revoke all on function public.create_reservation_base(jsonb) from public, anon, authenticated;
create function public.create_reservation(payload jsonb)
returns public.reservations language plpgsql security definer set search_path=public
as $$ declare result public.reservations; catalog_id uuid := nullif(payload->>'service_catalog_item_id','')::uuid; begin
  if not public.is_active_staff() then raise exception 'Cuenta sin acceso de empleado activo'; end if;
  if catalog_id is not null and not exists(select 1 from public.service_catalog_items where id=catalog_id and kind='service_type' and active) then raise exception 'Servicio de catálogo no disponible'; end if;
  result := public.create_reservation_base(payload);
  if catalog_id is not null then
    update public.reservations set service_catalog_item_id=catalog_id where id=result.id returning * into result;
  end if;
  return result;
end $$;
revoke all on function public.create_reservation(jsonb) from public, anon;
grant execute on function public.create_reservation(jsonb) to authenticated;
commit;
