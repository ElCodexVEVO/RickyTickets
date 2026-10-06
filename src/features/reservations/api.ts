import { supabase } from "@/lib/supabaseClient";
import type {
  ReservationFormValues,
  SaveIntent,
} from "@/lib/validators/reservationSchema";
import type {
  ReservationLocationFields,
  ReservationRow,
  ReservationStatus,
  ReservationWithRelations,
  TicketFileRow,
  ReservationStatusHistoryRow,
} from "@/types/database.types";
import {
  locationFields,
  reservationLocationPayload,
} from "@/lib/reservationLocations";
import { joinPhone } from "@/lib/phone";
import { toAmount } from "@/lib/payments";

const RESERVATION_RELATIONS_SELECT = `
  *,
  customer:customers ( id, full_name, phone, email )
`;

export interface ReservationFilters {
  search?: string;
  status?: ReservationStatus | "all";
  from?: string;
  to?: string;
}

export async function listReservations(
  filters: ReservationFilters,
): Promise<ReservationWithRelations[]> {
  let query = supabase
    .from("reservations")
    .select(RESERVATION_RELATIONS_SELECT)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("time", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.from) query = query.gte("date", filters.from);
  if (filters.to) query = query.lte("date", filters.to);

  let rows: ReservationWithRelations[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    const page = (data ?? []) as unknown as ReservationWithRelations[];
    rows.push(...page);
    if (page.length < 500) break;
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((r) =>
      [
        r.folio,
        r.customer?.full_name,
        r.customer?.phone,
        r.flight_number,
        r.return_flight_number,
        r.pickup_point,
        r.dropoff_point,
        r.hotel,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }

  return rows;
}

export async function getReservation(
  id: string,
): Promise<ReservationWithRelations> {
  const { data, error } = await supabase
    .from("reservations")
    .select(RESERVATION_RELATIONS_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as ReservationWithRelations;
}

export async function getReservationStatusHistory(reservationId: string) {
  const { data, error } = await supabase
    .from("reservation_status_history")
    .select("*")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReservationStatusHistoryRow[];
}

export async function getReservationFiles(reservationId: string) {
  const { data, error } = await supabase
    .from("ticket_files")
    .select("*, generator:profiles(full_name)")
    .eq("reservation_id", reservationId)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (TicketFileRow & {
    generator: { full_name: string } | null;
  })[];
}

export async function cancelReservationRpc(id: string, note?: string) {
  const { data, error } = await supabase.rpc("cancel_reservation", {
    _id: id,
    _note: note ?? null,
  });
  if (error) throw error;
  return data as ReservationRow;
}

export async function softDeleteReservationRpc(id: string) {
  const { error } = await supabase.rpc("soft_delete_reservation", { _id: id });
  if (error) throw error;
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
) {
  const { data, error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ReservationRow;
}

export interface ReservationEditableFields extends ReservationLocationFields {
  service_type: "sencillo" | "redondo";
  service_catalog_item_id: string | null;
  passengers: number;
  airline: string | null;
  flight_number: string | null;
  flight_date: string | null;
  flight_time: string | null;
  return_date: string | null;
  return_time: string | null;
  return_pickup_point: string | null;
  return_dropoff_point: string | null;
  return_airline: string | null;
  return_flight_number: string | null;
  pickup_point: string;
  dropoff_point: string;
  hotel: string | null;
  room: string | null;
  date: string;
  time: string;
  price: number | null;
  deposit: number;
  currency: "USD" | "MXN";
  payment_method: string | null;
  notes: string | null;
  status: ReservationStatus;
}

export async function updateReservationFields(
  id: string,
  patch: Partial<ReservationEditableFields>,
) {
  const safePatch = await compatiblePayload(patch);
  const { data, error } = await supabase
    .from("reservations")
    .update(safePatch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ReservationRow;
}

// Sin vuelo activado se descartan los datos de vuelo escritos; solo ida descarta el
// regreso; «Por determinar» guarda return_time NULL.
export function reservationPayload(values: ReservationFormValues) {
  const roundTrip = values.service_type === "redondo";
  const flight = values.include_flight;
  return {
    ...reservationLocationPayload(values),
    customer_full_name: values.customer_full_name.trim(),
    customer_phone: joinPhone(values.phone_country, values.customer_phone),
    customer_email: values.customer_email || null,
    service_type: values.service_type,
    service_catalog_item_id: values.service_catalog_item_id || null,
    pickup_point: values.pickup_point,
    dropoff_point: values.dropoff_point,
    hotel: values.hotel || null,
    room: values.room || null,
    date: values.date,
    time: values.time,
    airline: flight ? values.airline || null : null,
    flight_number: flight ? values.flight_number || null : null,
    flight_date: flight ? values.flight_date || null : null,
    flight_time: flight ? values.flight_time || null : null,
    return_date: roundTrip ? values.return_date || null : null,
    return_time:
      roundTrip && !values.return_time_pending
        ? values.return_time || null
        : null,
    return_pickup_point: roundTrip ? values.return_pickup_point || null : null,
    return_dropoff_point: roundTrip
      ? values.return_dropoff_point || null
      : null,
    return_airline: roundTrip && flight ? values.return_airline || null : null,
    return_flight_number:
      roundTrip && flight ? values.return_flight_number || null : null,
    passengers: values.passengers,
    price: toAmount(values.price),
    deposit: toAmount(values.deposit) ?? 0,
    currency: values.currency,
    payment_method: values.payment_method || null,
    notes: values.notes || null,
  };
}

export async function createReservation({
  values,
  intent,
}: {
  values: ReservationFormValues;
  intent: SaveIntent;
}): Promise<ReservationRow> {
  const payload = await compatiblePayload({
    ...reservationPayload(values),
    ...(intent === "draft" ? { status: "draft" as const } : {}),
  });
  const { data, error } = await supabase.rpc("create_reservation", { payload });
  if (error) throw error;
  return data as ReservationRow;
}

// Detecta columnas opcionales para seguir funcionando antes de aplicar una
// migración. Los resultados se guardan un minuto.
function columnSupport(probe: () => PromiseLike<{ error: unknown }>) {
  let cache: { expires: number; supported: boolean } | undefined;
  let request: Promise<boolean> | undefined;
  return async function supported(): Promise<boolean> {
    if (cache && Date.now() < cache.expires) return cache.supported;
    if (request) return request;
    request = (async () => {
      const { error } = await probe();
      const code = (error as { code?: string } | null)?.code ?? "";
      // 42703/PGRST204: columna inexistente · 22P02: valor de enum inexistente.
      if (error && !["42703", "PGRST204", "22P02"].includes(code)) throw error;
      cache = { expires: Date.now() + 60_000, supported: !error };
      return !error;
    })();
    try {
      return await request;
    } finally {
      request = undefined;
    }
  };
}

export const getReservationLocationSupport = columnSupport(() =>
  supabase
    .from("reservations")
    .select(
      "origin_lat,destination_lat,return_origin_lat,return_destination_lat",
    )
    .limit(0),
);
// 0008: borradores, anticipo y hora del vuelo.
export const getQuickReservationSupport = columnSupport(() =>
  supabase
    .from("reservations")
    .select("deposit,flight_time")
    .eq("status", "draft")
    .limit(0),
);

const quickKeys = new Set(["deposit", "flight_time"]);
async function compatiblePayload<T extends object>(payload: T): Promise<T> {
  let entries = Object.entries(payload);
  const locationKeys = new Set<string>(locationFields);
  const filled = (value: unknown) =>
    value != null && value !== "" && value !== 0;
  if (
    entries.some(([key]) => locationKeys.has(key)) &&
    !(await getReservationLocationSupport())
  ) {
    if (entries.some(([key, value]) => locationKeys.has(key) && filled(value)))
      throw new Error(
        "Las coordenadas aún no se pueden guardar. Activa la actualización de ubicaciones antes de continuar; tu borrador se conserva.",
      );
    entries = entries.filter(([key]) => !locationKeys.has(key));
  }
  const draft = entries.some(
    ([key, value]) => key === "status" && value === "draft",
  );
  if (
    (draft || entries.some(([key]) => quickKeys.has(key))) &&
    !(await getQuickReservationSupport())
  ) {
    if (
      draft ||
      entries.some(([key, value]) => quickKeys.has(key) && filled(value))
    )
      throw new Error(
        "Los borradores, el anticipo y la hora del vuelo requieren la migración 0008. Tus datos siguen en el formulario.",
      );
    entries = entries.filter(([key]) => !quickKeys.has(key));
  }
  return Object.fromEntries(entries) as T;
}
