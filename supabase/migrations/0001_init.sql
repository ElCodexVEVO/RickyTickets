-- ============================================================================
-- RickyTickets · Danny Transfers — esquema inicial
-- Aplicar con: supabase db push  (o pegar en el SQL editor del proyecto)
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'employee');
create type public.service_type as enum ('sencillo', 'redondo');
create type public.reservation_status as enum ('pending', 'confirmed', 'in_service', 'completed', 'cancelled');
create type public.currency_code as enum ('USD', 'MXN');
create type public.vehicle_type as enum ('van', 'suv', 'sedan', 'sprinter');
create type public.vehicle_status as enum ('available', 'in_service', 'maintenance', 'inactive');
create type public.driver_status as enum ('available', 'on_service', 'off_duty', 'inactive');

-- ----------------------------------------------------------------------------
-- TABLAS
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'employee',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  total_services integer not null default 0,
  total_spent numeric(12, 2) not null default 0,
  last_service_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index customers_phone_unique on public.customers (lower(phone)) where phone is not null and deleted_at is null;
create unique index customers_email_unique on public.customers (lower(email)) where email is not null and deleted_at is null;
create index customers_search_idx on public.customers using gin (to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, '')));

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  plate text not null,
  capacity integer not null,
  type public.vehicle_type not null default 'van',
  status public.vehicle_status not null default 'available',
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index vehicles_plate_unique on public.vehicles (lower(plate)) where deleted_at is null;

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  status public.driver_status not null default 'available',
  photo_url text,
  license_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index drivers_vehicle_idx on public.drivers (vehicle_id);

-- Catálogos configurables (Configuración) en vez de listas fijas en el código.
create table public.service_catalog_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('service_type', 'payment_method', 'location')),
  code text,
  label text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index service_catalog_kind_idx on public.service_catalog_items (kind) where active = true;

create table public.folio_counters (
  year integer primary key,
  last_number integer not null default 0
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  folio text unique,
  customer_id uuid not null references public.customers (id),
  service_type public.service_type not null default 'sencillo',
  pickup_point text not null,
  dropoff_point text not null,
  hotel text,
  room text,
  date date not null,
  time time not null,
  airline text,
  flight_number text,
  flight_date date,
  -- información de regreso (solo aplica si service_type = 'redondo')
  return_date date,
  return_time time,
  return_pickup_point text,
  return_dropoff_point text,
  return_airline text,
  return_flight_number text,
  passengers integer not null default 1,
  price numeric(12, 2),
  currency public.currency_code not null default 'USD',
  payment_method text,
  notes text,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  driver_id uuid references public.drivers (id) on delete set null,
  status public.reservation_status not null default 'pending',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index reservations_date_idx on public.reservations (date);
create index reservations_status_idx on public.reservations (status);
create index reservations_customer_idx on public.reservations (customer_id);
create index reservations_created_by_idx on public.reservations (created_by);
create index reservations_vehicle_idx on public.reservations (vehicle_id);
create index reservations_driver_idx on public.reservations (driver_id);

create table public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  previous_status public.reservation_status,
  new_status public.reservation_status not null,
  changed_by uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index reservation_status_history_res_idx on public.reservation_status_history (reservation_id);

create table public.ticket_files (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  storage_path text not null,
  version integer not null default 1,
  generated_by uuid references public.profiles (id),
  generated_at timestamptz not null default now()
);

create index ticket_files_res_idx on public.ticket_files (reservation_id);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
create index activity_logs_actor_idx on public.activity_logs (actor_id);

-- ----------------------------------------------------------------------------
-- FUNCIONES AUXILIARES DE SEGURIDAD
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.can_edit_reservations()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid()
      and active = true
      and coalesce((permissions ->> 'can_edit_reservations')::boolean, false) = true
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger trg_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger trg_reservations_updated_at before update on public.reservations for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ALTA AUTOMÁTICA DE PERFIL AL REGISTRARSE (el primer usuario queda admin)
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when is_first then 'admin' else 'employee' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.permissions is distinct from old.permissions
      or new.active is distinct from old.active)
     and not public.is_admin() then
    raise exception 'Solo un administrador puede modificar rol, permisos o estado de un usuario';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

-- ----------------------------------------------------------------------------
-- FOLIO ATÓMICO: DT-AAAA-000001
-- ----------------------------------------------------------------------------

create or replace function public.generate_folio()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr int := extract(year from now())::int;
  next_number int;
begin
  insert into public.folio_counters (year, last_number)
  values (yr, 0)
  on conflict (year) do nothing;

  update public.folio_counters
  set last_number = last_number + 1
  where year = yr
  returning last_number into next_number;

  return 'DT-' || yr || '-' || lpad(next_number::text, 6, '0');
end;
$$;

create or replace function public.set_reservation_folio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.folio is null then
    new.folio := public.generate_folio();
  end if;
  return new;
end;
$$;

create trigger trg_reservations_folio
  before insert on public.reservations
  for each row execute function public.set_reservation_folio();

-- ----------------------------------------------------------------------------
-- HISTORIAL DE ESTADO AUTOMÁTICO
-- ----------------------------------------------------------------------------

create or replace function public.log_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.reservation_status_history (reservation_id, previous_status, new_status, changed_by)
    values (new.id, null, new.status, new.created_by);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.reservation_status_history (reservation_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_reservations_status_insert after insert on public.reservations for each row execute function public.log_reservation_status();
create trigger trg_reservations_status_update after update on public.reservations for each row execute function public.log_reservation_status();

-- Evita que un empleado cancele o "elimine" (soft delete) saltándose la regla de negocio,
-- incluso si en algún momento tuviera permiso de UPDATE sobre la fila.
create or replace function public.guard_reservation_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at and not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar una reservación';
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' and not public.is_admin() then
    raise exception 'Solo un administrador puede cancelar una reservación';
  end if;

  return new;
end;
$$;

create trigger trg_reservations_guard before update on public.reservations for each row execute function public.guard_reservation_update();

-- Mantiene customers.total_services / total_spent / last_service_at sin cálculos manuales.
create or replace function public.sync_customer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.customers
    set total_services = total_services + 1,
        last_service_at = now()
    where id = new.customer_id;
  elsif tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      update public.customers set total_services = greatest(total_services - 1, 0) where id = new.customer_id;
    end if;
    if new.status = 'completed' and old.status is distinct from 'completed' then
      update public.customers set total_spent = total_spent + coalesce(new.price, 0) where id = new.customer_id;
    end if;
    if old.status = 'completed' and new.status is distinct from 'completed' then
      update public.customers set total_spent = greatest(total_spent - coalesce(new.price, 0), 0) where id = new.customer_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_reservations_customer_stats after insert or update on public.reservations for each row execute function public.sync_customer_stats();

-- ----------------------------------------------------------------------------
-- RPCs DE NEGOCIO (transacciones atómicas desde el frontend)
-- ----------------------------------------------------------------------------

create or replace function public.create_reservation(payload jsonb)
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
    date, time, airline, flight_number, flight_date,
    return_date, return_time, return_pickup_point, return_dropoff_point, return_airline, return_flight_number,
    passengers, price, currency, payment_method, notes, vehicle_id, driver_id, created_by
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
    nullif(payload ->> 'return_date', '')::date,
    nullif(payload ->> 'return_time', '')::time,
    nullif(payload ->> 'return_pickup_point', ''),
    nullif(payload ->> 'return_dropoff_point', ''),
    nullif(payload ->> 'return_airline', ''),
    nullif(payload ->> 'return_flight_number', ''),
    coalesce((payload ->> 'passengers')::int, 1),
    nullif(payload ->> 'price', '')::numeric,
    coalesce((payload ->> 'currency')::public.currency_code, 'USD'),
    nullif(payload ->> 'payment_method', ''),
    nullif(payload ->> 'notes', ''),
    nullif(payload ->> 'vehicle_id', '')::uuid,
    nullif(payload ->> 'driver_id', '')::uuid,
    auth.uid()
  )
  returning * into v_reservation;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'create_reservation', 'reservation', v_reservation.id, jsonb_build_object('folio', v_reservation.folio));

  return v_reservation;
end;
$$;

grant execute on function public.create_reservation(jsonb) to authenticated;

create or replace function public.cancel_reservation(_id uuid, _note text default null)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cancelar una reservación';
  end if;

  update public.reservations set status = 'cancelled' where id = _id returning * into v_res;

  if _note is not null then
    update public.reservation_status_history
    set note = _note
    where id = (
      select id from public.reservation_status_history
      where reservation_id = _id
      order by created_at desc
      limit 1
    );
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cancel_reservation', 'reservation', _id, jsonb_build_object('note', _note));

  return v_res;
end;
$$;

grant execute on function public.cancel_reservation(uuid, text) to authenticated;

create or replace function public.soft_delete_reservation(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar una reservación';
  end if;

  update public.reservations set deleted_at = now() where id = _id;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'delete_reservation', 'reservation', _id);
end;
$$;

grant execute on function public.soft_delete_reservation(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.service_catalog_items enable row level security;
alter table public.folio_counters enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.ticket_files enable row level security;
alter table public.settings enable row level security;
alter table public.activity_logs enable row level security;

-- profiles: cada quien ve/edita lo suyo; admin ve/edita todo (el trigger de arriba
-- bloquea que un empleado se autoasigne rol o permisos aunque la policy lo deje pasar).
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- sin policy de insert/delete: el alta ocurre por trigger en auth.users (bypassa RLS).

-- customers / vehicles / drivers: catálogo operativo compartido por todo el equipo.
create policy customers_select on public.customers for select to authenticated using (true);
create policy customers_insert on public.customers for insert to authenticated with check (true);
create policy customers_update on public.customers for update to authenticated using (true) with check (true);
create policy customers_delete on public.customers for delete to authenticated using (public.is_admin());

create policy vehicles_select on public.vehicles for select to authenticated using (true);
create policy vehicles_write on public.vehicles for insert to authenticated with check (public.is_admin());
create policy vehicles_update on public.vehicles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy vehicles_delete on public.vehicles for delete to authenticated using (public.is_admin());

create policy drivers_select on public.drivers for select to authenticated using (true);
create policy drivers_write on public.drivers for insert to authenticated with check (public.is_admin());
create policy drivers_update on public.drivers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy drivers_delete on public.drivers for delete to authenticated using (public.is_admin());

-- catálogos de Configuración: lectura para todos, escritura solo admin.
create policy catalog_select on public.service_catalog_items for select to authenticated using (true);
create policy catalog_write on public.service_catalog_items for insert to authenticated with check (public.is_admin());
create policy catalog_update on public.service_catalog_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy catalog_delete on public.service_catalog_items for delete to authenticated using (public.is_admin());

-- reservations: ver todo lo no eliminado (admin ve incluso lo eliminado);
-- crear siempre permitido; editar según permiso; cancelar/eliminar reforzado por trigger.
create policy reservations_select on public.reservations for select to authenticated
  using (deleted_at is null or public.is_admin());
create policy reservations_insert on public.reservations for insert to authenticated
  with check (created_by = auth.uid());
create policy reservations_update on public.reservations for update to authenticated
  using (public.is_admin() or public.can_edit_reservations())
  with check (public.is_admin() or public.can_edit_reservations());
-- sin policy de delete: el borrado físico queda prohibido, solo existe soft delete vía RPC.

create policy reservation_status_history_select on public.reservation_status_history for select to authenticated using (true);
-- sin policy de insert: solo lo llenan los triggers (SECURITY DEFINER).

create policy ticket_files_select on public.ticket_files for select to authenticated using (true);
create policy ticket_files_insert on public.ticket_files for insert to authenticated with check (generated_by = auth.uid());

create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_write on public.settings for insert to authenticated with check (public.is_admin());
create policy settings_update on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy activity_logs_select on public.activity_logs for select to authenticated using (public.is_admin());
-- sin policy de insert: solo se escribe desde las funciones RPC (SECURITY DEFINER).

-- folio_counters: sin policies -> bloqueado por completo salvo para las funciones
-- SECURITY DEFINER (que corren con privilegios del owner y omiten RLS).

-- ----------------------------------------------------------------------------
-- STORAGE: bucket privado para los PDFs de tickets
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', false)
on conflict (id) do nothing;

create policy tickets_bucket_select on storage.objects for select to authenticated
  using (bucket_id = 'tickets');
create policy tickets_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'tickets');
create policy tickets_bucket_update on storage.objects for update to authenticated
  using (bucket_id = 'tickets' and public.is_admin());
create policy tickets_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'tickets' and public.is_admin());

insert into storage.buckets (id, name, public)
values ('fleet-photos', 'fleet-photos', true)
on conflict (id) do nothing;

create policy fleet_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'fleet-photos');
create policy fleet_photos_write on storage.objects for insert to authenticated
  with check (bucket_id = 'fleet-photos' and public.is_admin());
create policy fleet_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'fleet-photos' and public.is_admin());
create policy fleet_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fleet-photos' and public.is_admin());
