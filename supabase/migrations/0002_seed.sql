-- ============================================================================
-- RickyTickets · datos iniciales (catálogos y configuración de la empresa)
-- ============================================================================

insert into public.service_catalog_items (kind, code, label, sort_order) values
  ('service_type', 'aeropuerto_hotel', 'Aeropuerto → Hotel', 1),
  ('service_type', 'hotel_aeropuerto', 'Hotel → Aeropuerto', 2),
  ('service_type', 'tour', 'Tour', 3),
  ('service_type', 'traslado_privado', 'Traslado privado', 4)
on conflict do nothing;

insert into public.service_catalog_items (kind, code, label, sort_order) values
  ('payment_method', 'cash', 'Efectivo', 1),
  ('payment_method', 'card', 'Tarjeta', 2),
  ('payment_method', 'transfer', 'Transferencia', 3)
on conflict do nothing;

insert into public.service_catalog_items (kind, code, label, sort_order) values
  ('location', 'tqo', 'Tulum Airport (TQO)', 1),
  ('location', 'cun', 'Cancún Airport (CUN)', 2),
  ('location', 'tulum_centro', 'Tulum Centro', 3),
  ('location', 'playa_del_carmen', 'Playa del Carmen', 4)
on conflict do nothing;

insert into public.settings (key, value) values
  ('company_info', jsonb_build_object(
    'name', 'Danny Transfers',
    'tagline', 'Tulum Mexico',
    'phone', '+52 984 239 67 62',
    'instagram', '@dannytransfers',
    'whatsapp', '+52 984 239 67 62'
  )),
  ('meeting_points', jsonb_build_object(
    'tulum_airport', 'At Gate 4',
    'cancun_airport', 'Terminal 2: Welcome Bar · Terminal 3: Margarita Ville Restaurant · Terminal 4: Welcome Bar'
  )),
  ('ticket_terms', jsonb_build_object(
    'text', 'Payment can be made in cash or by card. If paid by card, there is a 5% extra charge. In case of problems, delays, or if you cannot find your driver, please contact the operations manager.'
  ))
on conflict (key) do nothing;
