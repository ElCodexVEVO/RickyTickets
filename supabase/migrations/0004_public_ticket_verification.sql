-- ============================================================================
-- Verificación pública de ticket (para el QR del PDF)
-- Expone solo lo esencial de una reservación a cualquiera con el enlace/QR,
-- sin requerir sesión y sin filtrar teléfono, email, precio ni notas.
-- ============================================================================

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
  where r.id = reservation_id and r.deleted_at is null;
$$;

-- anon: para que cualquiera con el link/QR pueda verificar sin iniciar sesión.
grant execute on function public.get_public_ticket(uuid) to anon, authenticated;
