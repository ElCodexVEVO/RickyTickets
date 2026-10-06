-- Nueva reservación en una sola página: borradores, anticipo y hora del vuelo.
-- Aplicar después de 0007. No elimina tablas, columnas ni datos históricos:
-- vehicles, drivers, reservations.vehicle_id y reservations.driver_id se conservan
-- (ver docs/RESERVACION_UNA_PAGINA.md para su retiro posterior).

-- PostgreSQL no permite usar un valor nuevo del enum antes del commit. Nada en este
-- archivo lo usa como enum: las funciones y políticas comparan status::text.
alter type public.reservation_status add value if not exists 'draft' before 'pending';

begin;

alter table public.reservations
  add column deposit numeric(12, 2),
  add column flight_time time,
  add constraint reservation_deposit_non_negative check (deposit is null or deposit >= 0);

comment on column public.reservations.deposit is
  'Anticipo recibido. NULL en reservaciones anteriores a 0008: sin registro, no equivale a 0.';
comment on column public.reservations.flight_time is 'Hora del vuelo (opcional).';
comment on column public.reservations.vehicle_id is
  'Obsoleto desde 0008: la aplicación ya no asigna vehículos. Se conserva por historial.';
comment on column public.reservations.driver_id is
  'Obsoleto desde 0008: la aplicación ya no asigna conductores. Se conserva por historial.';
comment on table public.vehicles is 'Obsoleta desde 0008. Sin uso en la aplicación; conservar hasta su retiro planificado.';
comment on table public.drivers is 'Obsoleta desde 0008. Sin uso en la aplicación; conservar hasta su retiro planificado.';

-- Inserción base (0001, renombrada en 0006): misma búsqueda de cliente por teléfono
-- o correo, folio y actividad. Añade estado inicial (borrador o pendiente), anticipo
-- y hora del vuelo en el mismo INSERT; ya no lee vehicle_id ni driver_id.
create or replace function public.create_reservation_base(payload jsonb)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_phone text := nullif(trim(payload ->> 'customer_phone'), '');
  v_email text := nullif(trim(payload ->> 'customer_email'), '');
  v_full_name text := payload ->> 'customer_full_name';
  v_status text := case when payload ->> 'status' = 'draft' then 'draft' else 'pending' end;
  v_reservation public.reservations;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if v_phone is not null then
    select id into v_customer_id from public.customers
    where deleted_at is null and lower(phone) = lower(v_phone) limit 1;
  end if;

  if v_customer_id is null and v_email is not null then
    select id into v_customer_id from public.customers
    where deleted_at is null and lower(email) = lower(v_email) limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (full_name, phone, email)
    values (coalesce(v_full_name, 'Cliente sin nombre'), v_phone, v_email)
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = coalesce(nullif(v_full_name, ''), full_name),
        phone = coalesce(v_phone, phone),
        email = coalesce(v_email, email)
    where id = v_customer_id;
  end if;

  insert into public.reservations (
    customer_id, service_type, pickup_point, dropoff_point, hotel, room,
    date, time, airline, flight_number, flight_date, flight_time,
    return_date, return_time, return_pickup_point, return_dropoff_point, return_airline, return_flight_number,
    passengers, price, deposit, currency, payment_method, notes, status, created_by
  ) values (
    v_customer_id,
    coalesce((payload ->> 'service_type')::public.service_type, 'sencillo'),
    payload ->> 'pickup_point',
    payload ->> 'dropoff_point',
    nullif(payload ->> 'hotel', ''),
    nullif(payload ->> 'room', ''),
    (payload ->> 'date')::date,
    (payload ->> 'time')::time,
    nullif(payload ->> 'airline', ''),
    nullif(payload ->> 'flight_number', ''),
    nullif(payload ->> 'flight_date', '')::date,
    nullif(payload ->> 'flight_time', '')::time,
    nullif(payload ->> 'return_date', '')::date,
    nullif(payload ->> 'return_time', '')::time,
    nullif(payload ->> 'return_pickup_point', ''),
    nullif(payload ->> 'return_dropoff_point', ''),
    nullif(payload ->> 'return_airline', ''),
    nullif(payload ->> 'return_flight_number', ''),
    coalesce((payload ->> 'passengers')::int, 1),
    nullif(payload ->> 'price', '')::numeric,
    coalesce(nullif(payload ->> 'deposit', '')::numeric, 0),
    coalesce((payload ->> 'currency')::public.currency_code, 'USD'),
    nullif(payload ->> 'payment_method', ''),
    nullif(payload ->> 'notes', ''),
    v_status::public.reservation_status,
    auth.uid()
  )
  returning * into v_reservation;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'create_reservation', 'reservation', v_reservation.id,
    jsonb_build_object('folio', v_reservation.folio, 'status', v_status));

  return v_reservation;
end;
$$;
revoke all on function public.create_reservation_base(jsonb) from public, anon, authenticated;

-- Un borrador no cuenta como servicio del cliente hasta que se completa.
create or replace function public.sync_customer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status::text <> 'draft' then
      update public.customers
      set total_services = total_services + 1,
          last_service_at = now()
      where id = new.customer_id;
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status::text = 'draft' and new.status::text not in ('draft', 'cancelled') then
      update public.customers
      set total_services = total_services + 1,
          last_service_at = now()
      where id = new.customer_id;
    end if;
    if new.status::text = 'cancelled' and old.status::text not in ('cancelled', 'draft') then
      update public.customers set total_services = greatest(total_services - 1, 0) where id = new.customer_id;
    end if;
    if new.status::text = 'completed' and old.status::text <> 'completed' then
      update public.customers set total_spent = total_spent + coalesce(new.price, 0) where id = new.customer_id;
    end if;
    if old.status::text = 'completed' and new.status::text <> 'completed' then
      update public.customers set total_spent = greatest(total_spent - coalesce(new.price, 0), 0) where id = new.customer_id;
    end if;
  end if;
  return new;
end;
$$;

-- Auditoría (0005) con anticipo y hora del vuelo.
create or replace function public.log_reservation_changes()
returns trigger language plpgsql security definer set search_path = public
as $$ declare changes jsonb; begin
  select jsonb_object_agg(n.key, jsonb_build_object('before',o.value,'after',n.value)) into changes
  from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using(key)
  where n.value is distinct from o.value and n.key in ('return_time','return_date','date','time','driver_id','vehicle_id','status','passengers','pickup_point','dropoff_point','price','deposit','currency','payment_method','flight_number','flight_time','return_pickup_point','return_dropoff_point');
  if changes is not null then
    insert into public.activity_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'update_reservation','reservation',new.id,jsonb_build_object('folio',new.folio,'changes',changes));
  end if;
  return new;
end $$;

-- Quien creó un borrador puede continuarlo y completarlo aunque no tenga permiso
-- general de edición. No puede cancelarlo ni ocultarlo (trigger de 0001).
create policy reservations_update_own_draft on public.reservations for update to authenticated
  using (created_by = auth.uid() and status::text = 'draft')
  with check (created_by = auth.uid() and status::text in ('draft', 'pending'));

-- Un borrador no es un ticket: el QR público no lo expone.
create or replace function public.get_public_ticket(reservation_id uuid)
returns table (
  folio text,
  customer_name text,
  pickup_point text,
  dropoff_point text,
  hotel text,
  room text,
  passengers integer,
  "date" date,
  "time" time,
  status public.reservation_status,
  service_type public.service_type,
  return_date date,
  return_time time,
  return_pickup_point text,
  return_dropoff_point text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.folio,
    c.full_name,
    r.pickup_point,
    r.dropoff_point,
    r.hotel,
    r.room,
    r.passengers,
    r.date,
    r.time,
    r.status,
    r.service_type,
    r.return_date,
    r.return_time,
    r.return_pickup_point,
    r.return_dropoff_point
  from public.reservations r
  join public.customers c on c.id = r.customer_id
  where r.id = reservation_id and r.deleted_at is null and r.status::text <> 'draft';
$$;

notify pgrst, 'reload schema';
commit;
