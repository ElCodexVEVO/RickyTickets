-- Optional verified pickup/drop-off coordinates. No backfill or GPS data.
-- Existing reservations keep their text and NULL locations.
begin;
alter table public.reservations
  add column origin_lat double precision,
  add column origin_lng double precision,
  add column origin_address text,
  add column destination_lat double precision,
  add column destination_lng double precision,
  add column destination_address text,
  add column return_origin_lat double precision,
  add column return_origin_lng double precision,
  add column return_origin_address text,
  add column return_destination_lat double precision,
  add column return_destination_lng double precision,
  add column return_destination_address text,
  add constraint reservation_origin_coordinates check ((origin_lat is null) = (origin_lng is null) and (origin_lat is null or origin_lat between -90 and 90 and origin_lng between -180 and 180)),
  add constraint reservation_destination_coordinates check ((destination_lat is null) = (destination_lng is null) and (destination_lat is null or destination_lat between -90 and 90 and destination_lng between -180 and 180)),
  add constraint reservation_return_origin_coordinates check ((return_origin_lat is null) = (return_origin_lng is null) and (return_origin_lat is null or return_origin_lat between -90 and 90 and return_origin_lng between -180 and 180)),
  add constraint reservation_return_destination_coordinates check ((return_destination_lat is null) = (return_destination_lng is null) and (return_destination_lat is null or return_destination_lat between -90 and 90 and return_destination_lng between -180 and 180));

-- Preserve the installed creation logic, including folios, customers and catalog.
-- Internal helper stays inaccessible through PostgREST.
alter function public.create_reservation(jsonb) rename to create_reservation_without_locations;
revoke all on function public.create_reservation_without_locations(jsonb) from public, anon, authenticated;
create function public.create_reservation(payload jsonb)
returns public.reservations language plpgsql security definer set search_path = public
as $$
declare result public.reservations;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and active) then
    raise exception 'Cuenta sin acceso de empleado activo';
  end if;
  result := public.create_reservation_without_locations(payload);
  update public.reservations set
    origin_lat = nullif(payload->>'origin_lat','')::double precision,
    origin_lng = nullif(payload->>'origin_lng','')::double precision,
    origin_address = nullif(payload->>'origin_address',''),
    destination_lat = nullif(payload->>'destination_lat','')::double precision,
    destination_lng = nullif(payload->>'destination_lng','')::double precision,
    destination_address = nullif(payload->>'destination_address',''),
    return_origin_lat = case when result.service_type = 'redondo' then nullif(payload->>'return_origin_lat','')::double precision end,
    return_origin_lng = case when result.service_type = 'redondo' then nullif(payload->>'return_origin_lng','')::double precision end,
    return_origin_address = case when result.service_type = 'redondo' then nullif(payload->>'return_origin_address','') end,
    return_destination_lat = case when result.service_type = 'redondo' then nullif(payload->>'return_destination_lat','')::double precision end,
    return_destination_lng = case when result.service_type = 'redondo' then nullif(payload->>'return_destination_lng','')::double precision end,
    return_destination_address = case when result.service_type = 'redondo' then nullif(payload->>'return_destination_address','') end
  where id = result.id returning * into result;
  return result;
end $$;
revoke all on function public.create_reservation(jsonb) from public, anon;
grant execute on function public.create_reservation(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
