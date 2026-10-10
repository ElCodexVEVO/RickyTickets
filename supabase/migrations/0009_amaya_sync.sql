-- Server-only bridge. Run after 0008; never grant these RPCs to browser users.
begin;
alter table public.reservations
  add column sync_revision bigint not null default 1,
  add column amaya_id uuid unique,
  add column amaya_code text,
  add column amaya_payment jsonb;

-- Keep staff restrictions; the signed bridge runs as the trusted server role.
create or replace function public.guard_reservation_update() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(auth.role(),'')='service_role' then return new; end if;
  if new.deleted_at is distinct from old.deleted_at and not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar una reservación';
  end if;
  if new.status='cancelled' and old.status is distinct from 'cancelled' and not public.is_admin() then
    raise exception 'Solo un administrador puede cancelar una reservación';
  end if;
  return new;
end $$;

-- Updating customers also changes the representation of their reservations.
create function public.amaya_bump_revision() returns trigger language plpgsql as $$
begin new.sync_revision := old.sync_revision + 1; return new; end $$;
create trigger amaya_revision before update on public.reservations
for each row execute function public.amaya_bump_revision();
create function public.amaya_customer_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if row(new.full_name,new.email,new.phone) is distinct from row(old.full_name,old.email,old.phone) then
    update public.reservations set updated_at=now() where customer_id=new.id;
  end if;
  return new;
end $$;
create trigger amaya_customer_revision after update on public.customers
for each row execute function public.amaya_customer_changed();

create table public.amaya_sync_events (
  id uuid primary key,
  request jsonb not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.amaya_sync_events enable row level security;
revoke all on public.amaya_sync_events from public,anon,authenticated;

create function public.amaya_reservation_snapshot(reservation_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'id',r.id,'folio',r.folio,'revision',r.sync_revision,
    'amaya_id',r.amaya_id,'amaya_code',r.amaya_code,'amaya_payment',r.amaya_payment,
    'deleted',r.deleted_at is not null,'updated_at',r.updated_at,
    'customer_name',c.full_name,'customer_email',c.email,'customer_phone',c.phone,
    'pickup_point',r.pickup_point,'dropoff_point',r.dropoff_point,'hotel',r.hotel,
    'date',r.date,'time',to_char(r.time,'HH24:MI'),'service_type',r.service_type,
    'return_date',r.return_date,'return_time',to_char(r.return_time,'HH24:MI'),
    'return_pickup_point',r.return_pickup_point,'return_dropoff_point',r.return_dropoff_point,
    'passengers',r.passengers,'airline',r.airline,'flight_number',r.flight_number,
    'status',r.status,'notes',r.notes,'price',r.price,'deposit',r.deposit,'currency',r.currency
  ) from public.reservations r join public.customers c on c.id=r.customer_id where r.id=reservation_id
$$;

-- Keyset pagination includes soft deletions; no timestamp cursor can miss a commit.
create function public.amaya_sync_list(after_id uuid default null, page_size integer default 100) returns jsonb
language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(public.amaya_reservation_snapshot(id) order by id),'[]'::jsonb)
  from (select id from public.reservations where after_id is null or id>after_id
        order by id limit least(greatest(page_size,1),200)) p
$$;

-- Idempotency and optimistic locking apply inside one transaction. A lost HTTP
-- response can be retried without creating a second reservation or overwriting staff changes.
create function public.amaya_sync_apply(event_id uuid, reservation_id uuid, amaya_id uuid,
  expected_revision bigint, patch jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  prior public.amaya_sync_events;
  r public.reservations;
  customer_uuid uuid;
  phone_value text;
  email_value text;
  allowed text[] := array['customer_name','customer_email','customer_phone','pickup_point','dropoff_point',
    'hotel','date','time','service_type','return_date','return_time','return_pickup_point','return_dropoff_point',
    'passengers','airline','flight_number','status','notes','price','currency','amaya_code','amaya_payment'];
  request_data jsonb := jsonb_build_object('reservation_id',reservation_id,'amaya_id',amaya_id,
    'expected_revision',expected_revision,'patch',patch);
  result jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(event_id::text,0));
  select * into prior from public.amaya_sync_events where id=event_id;
  if found then
    if prior.request <> request_data then raise exception 'Idempotency key reused'; end if;
    return prior.response;
  end if;
  if jsonb_typeof(patch)<>'object' or exists(select 1 from jsonb_object_keys(patch) k where not(k=any(allowed)))
    then raise exception 'Unsupported fields'; end if;
  if amaya_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(amaya_id::text,1));
  end if;
  select * into r from public.reservations x where
    (reservation_id is not null and x.id=reservation_id) or
    (reservation_id is null and amaya_sync_apply.amaya_id is not null and x.amaya_id=amaya_sync_apply.amaya_id) for update;
  if found then
    if amaya_id is not null and r.amaya_id is distinct from amaya_id then raise exception 'Link mismatch'; end if;
    if r.deleted_at is not null or expected_revision is distinct from r.sync_revision then
      return jsonb_build_object('conflict',true,'reservation',public.amaya_reservation_snapshot(r.id));
    end if;
    -- Amount and currency are immutable through the bridge once created. Ricky
    -- staff keep control of their ledger; Amaya preserves its original Stripe quote.
    if patch ? 'price' and (patch->>'price')::numeric is distinct from r.price or
       patch ? 'currency' and patch->>'currency' is distinct from r.currency::text
      then raise exception 'Price adjustment requires manual reconciliation'; end if;
    customer_uuid := r.customer_id;
    if patch ? 'customer_name' or patch ? 'customer_email' or patch ? 'customer_phone' then
      update public.customers set
        full_name=case when patch?'customer_name' then patch->>'customer_name' else full_name end,
        email=case when patch?'customer_email' then nullif(patch->>'customer_email','') else email end,
        phone=case when patch?'customer_phone' then nullif(patch->>'customer_phone','') else phone end
      where id=customer_uuid;
    end if;
    update public.reservations set
      pickup_point=case when patch?'pickup_point' then patch->>'pickup_point' else pickup_point end,
      dropoff_point=case when patch?'dropoff_point' then patch->>'dropoff_point' else dropoff_point end,
      hotel=case when patch?'hotel' then patch->>'hotel' else hotel end,
      date=case when patch?'date' then (patch->>'date')::date else date end,
      time=case when patch?'time' then (patch->>'time')::time else time end,
      service_type=case when patch?'service_type' then (patch->>'service_type')::public.service_type else service_type end,
      return_date=case when patch?'return_date' then (patch->>'return_date')::date else return_date end,
      return_time=case when patch?'return_time' then (patch->>'return_time')::time else return_time end,
      return_pickup_point=case when patch?'return_pickup_point' then patch->>'return_pickup_point' else return_pickup_point end,
      return_dropoff_point=case when patch?'return_dropoff_point' then patch->>'return_dropoff_point' else return_dropoff_point end,
      passengers=case when patch?'passengers' then (patch->>'passengers')::integer else passengers end,
      airline=case when patch?'airline' then patch->>'airline' else airline end,
      flight_number=case when patch?'flight_number' then patch->>'flight_number' else flight_number end,
      status=case when patch?'status' then (patch->>'status')::public.reservation_status else status end,
      notes=case when patch?'notes' then patch->>'notes' else notes end,
      amaya_payment=case when patch?'amaya_payment' then patch->'amaya_payment' else amaya_payment end,
      updated_at=now()
    where id=r.id returning * into r;
  else
    if reservation_id is not null or amaya_id is null or expected_revision is not null then raise exception 'Reservation not found'; end if;
    phone_value := nullif(patch->>'customer_phone',''); email_value := nullif(patch->>'customer_email','');
    -- Serialize customer deduplication across independent Amaya bookings.
    perform pg_advisory_xact_lock(471233);
    select id into customer_uuid from public.customers where deleted_at is null and
      ((phone_value is not null and lower(phone)=lower(phone_value)) or
       (email_value is not null and lower(email)=lower(email_value))) order by created_at limit 1;
    if customer_uuid is null then
      insert into public.customers(full_name,phone,email) values(patch->>'customer_name',phone_value,email_value)
      returning id into customer_uuid;
    end if;
    insert into public.reservations(customer_id,amaya_id,amaya_code,amaya_payment,
      pickup_point,dropoff_point,hotel,date,time,service_type,return_date,return_time,
      return_pickup_point,return_dropoff_point,passengers,airline,flight_number,status,notes,price,currency,deposit)
    values(customer_uuid,amaya_id,patch->>'amaya_code',patch->'amaya_payment',
      patch->>'pickup_point',patch->>'dropoff_point',patch->>'hotel',(patch->>'date')::date,(patch->>'time')::time,
      (patch->>'service_type')::public.service_type,(patch->>'return_date')::date,(patch->>'return_time')::time,
      patch->>'return_pickup_point',patch->>'return_dropoff_point',(patch->>'passengers')::integer,
      patch->>'airline',patch->>'flight_number',(patch->>'status')::public.reservation_status,patch->>'notes',
      (patch->>'price')::numeric,(patch->>'currency')::public.currency_code,0) returning * into r;
  end if;
  if r.passengers<1 or r.passengers>100 or r.price<0 then raise exception 'Invalid reservation'; end if;
  result := jsonb_build_object('conflict',false,'reservation',public.amaya_reservation_snapshot(r.id));
  insert into public.amaya_sync_events(id,request,response) values(event_id,request_data,result);
  return result;
end $$;

revoke all on function public.amaya_reservation_snapshot(uuid), public.amaya_sync_list(uuid,integer),
  public.amaya_sync_apply(uuid,uuid,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.amaya_sync_list(uuid,integer),
  public.amaya_sync_apply(uuid,uuid,uuid,bigint,jsonb) to service_role;
commit;
