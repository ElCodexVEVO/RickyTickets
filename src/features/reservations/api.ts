import { supabase } from "@/lib/supabaseClient";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type { ReservationRow, ReservationStatus, ReservationWithRelations } from "@/types/database.types";

const RESERVATION_RELATIONS_SELECT = `
  *,
  customer:customers ( id, full_name, phone, email ),
  vehicle:vehicles ( id, brand, model, plate ),
  driver:drivers ( id, full_name, phone )
`;

export interface ReservationFilters {
  search?: string;
  status?: ReservationStatus | "all";
  from?: string;
  to?: string;
}

export async function listReservations(filters: ReservationFilters): Promise<ReservationWithRelations[]> {
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

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as ReservationWithRelations[];

  if (filters.search) {
    const term = filters.search.toLowerCase();
    rows = rows.filter((r) =>
      [r.folio, r.customer?.full_name, r.customer?.phone, r.flight_number, r.pickup_point, r.dropoff_point]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }

  return rows;
}

export async function getReservation(id: string): Promise<ReservationWithRelations> {
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
  return data ?? [];
}

export async function getReservationFiles(reservationId: string) {
  const { data, error } = await supabase
    .from("ticket_files")
    .select("*")
    .eq("reservation_id", reservationId)
    .order("version", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function cancelReservationRpc(id: string, note?: string) {
  const { data, error } = await supabase.rpc("cancel_reservation", { _id: id, _note: note ?? null });
  if (error) throw error;
  return data as ReservationRow;
}

export async function softDeleteReservationRpc(id: string) {
  const { error } = await supabase.rpc("soft_delete_reservation", { _id: id });
  if (error) throw error;
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  const { data, error } = await supabase.from("reservations").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data as ReservationRow;
}

export interface ReservationEditableFields {
  pickup_point: string;
  dropoff_point: string;
  hotel: string | null;
  room: string | null;
  date: string;
  time: string;
  price: number | null;
  currency: "USD" | "MXN";
  payment_method: string | null;
  notes: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
}

export async function updateReservationFields(id: string, patch: Partial<ReservationEditableFields>) {
  const { data, error } = await supabase.from("reservations").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as ReservationRow;
}

export async function createReservation(values: ReservationFormValues): Promise<ReservationRow> {
  const payload = {
    customer_full_name: values.customer_full_name,
    customer_phone: values.customer_phone,
    customer_email: values.customer_email || null,
    service_type: values.service_type,
    pickup_point: values.pickup_point,
    dropoff_point: values.dropoff_point,
    hotel: values.hotel || null,
    room: values.room || null,
    date: values.date,
    time: values.time,
    airline: values.airline || null,
    flight_number: values.flight_number || null,
    flight_date: values.flight_date || null,
    return_date: values.service_type === "redondo" ? values.return_date || null : null,
    return_time: values.service_type === "redondo" ? values.return_time || null : null,
    return_pickup_point: values.service_type === "redondo" ? values.return_pickup_point || null : null,
    return_dropoff_point: values.service_type === "redondo" ? values.return_dropoff_point || null : null,
    return_airline: values.service_type === "redondo" ? values.return_airline || null : null,
    return_flight_number: values.service_type === "redondo" ? values.return_flight_number || null : null,
    passengers: values.passengers,
    price: values.price ? Number(values.price) : null,
    currency: values.currency,
    payment_method: values.payment_method || null,
    notes: values.notes || null,
    vehicle_id: values.vehicle_id || null,
    driver_id: values.driver_id || null,
  };

  const { data, error } = await supabase.rpc("create_reservation", { payload });
  if (error) throw error;
  return data as ReservationRow;
}
