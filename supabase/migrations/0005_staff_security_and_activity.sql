-- Revisar y aplicar después de 0004. No elimina políticas ni altera perfiles existentes.
begin;
create or replace function public.is_active_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and active); $$;
revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated;

-- Restrictivas: AND con las políticas existentes; conserva reglas de rol/permisos.
do $$ declare tbl text; begin
  foreach tbl in array array['customers','vehicles','drivers','service_catalog_items','reservations',
    'reservation_status_history','ticket_files','settings','activity_logs'] loop
    execute format('create policy active_staff_only on public.%I as restrictive for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff())', tbl);
  end loop;
end $$;
create policy active_profile_changes on public.profiles as restrictive for update to authenticated
using (public.is_active_staff()) with check (public.is_active_staff());
create policy active_staff_storage on storage.objects as restrictive for all to authenticated
using (bucket_id not in ('tickets','fleet-photos') or public.is_active_staff())
with check (bucket_id not in ('tickets','fleet-photos') or public.is_active_staff());

-- RPC SECURITY DEFINER omite RLS; estos triggers cubren su escritura también.
create or replace function public.require_active_staff_write()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if coalesce(auth.role(), '') = 'authenticated' and not public.is_active_staff() then
    raise exception 'Cuenta desactivada o sin acceso de empleado';
  end if;
  return new;
end $$;
create trigger require_staff_reservations before insert or update on public.reservations
for each row execute function public.require_active_staff_write();
create trigger require_staff_customers before insert or update on public.customers
for each row execute function public.require_active_staff_write();

-- app_metadata solo lo modifica el servidor. Desactivar además signup en Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if coalesce((new.raw_app_meta_data ->> 'staff_access')::boolean, false) then
    insert into public.profiles(id, full_name, role)
    values(new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), new.email,'Empleado'),
      case when new.raw_app_meta_data ->> 'staff_role' = 'admin' then 'admin'::public.user_role else 'employee'::public.user_role end)
    on conflict(id) do nothing;
  end if;
  return new;
end $$;
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  if (new.role is distinct from old.role or new.permissions is distinct from old.permissions or new.active is distinct from old.active)
    and coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then
    raise exception 'Solo un administrador puede modificar rol, permisos o estado de un usuario';
  end if;
  return new;
end $$;

create or replace function public.log_reservation_changes()
returns trigger language plpgsql security definer set search_path = public
as $$ declare changes jsonb; begin
  select jsonb_object_agg(n.key, jsonb_build_object('before',o.value,'after',n.value)) into changes
  from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using(key)
  where n.value is distinct from o.value and n.key in ('return_time','return_date','date','time','driver_id','vehicle_id','status','passengers','pickup_point','dropoff_point','price','currency','payment_method','flight_number','return_pickup_point','return_dropoff_point');
  if changes is not null then
    insert into public.activity_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'update_reservation','reservation',new.id,jsonb_build_object('folio',new.folio,'changes',changes));
  end if;
  return new;
end $$;
create trigger log_reservation_changes after update on public.reservations
for each row execute function public.log_reservation_changes();
revoke execute on function public.create_reservation(jsonb), public.cancel_reservation(uuid,text),
  public.soft_delete_reservation(uuid), public.generate_folio() from public, anon;
grant execute on function public.create_reservation(jsonb), public.cancel_reservation(uuid,text),
  public.soft_delete_reservation(uuid) to authenticated;
commit;
