import {
  reservationFormDefaults,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import { reservationLocationDefaults } from "@/lib/reservationLocations";
import { splitPhone } from "@/lib/phone";
import type { ReservationWithRelations } from "@/types/database.types";

const hhmm = (value?: string | null) => (value ? value.slice(0, 5) : "");

// Valores del formulario de una sola página a partir de una reservación guardada.
// Las reservaciones anteriores pueden traer vehicle_id/driver_id: se ignoran.
export function formValuesFromReservation(
  r: ReservationWithRelations,
): ReservationFormValues {
  const phone = splitPhone(r.customer?.phone ?? "");
  return {
    ...reservationFormDefaults,
    ...reservationLocationDefaults(r),
    customer_full_name: r.customer?.full_name ?? "",
    customer_phone: phone.local,
    phone_country: phone.iso,
    customer_email: r.customer?.email ?? "",
    passengers: r.passengers,
    service_type: r.service_type,
    service_catalog_item_id: r.service_catalog_item_id ?? "",
    pickup_point: r.pickup_point,
    dropoff_point: r.dropoff_point,
    hotel: r.hotel ?? "",
    room: r.room ?? "",
    date: r.date,
    time: hhmm(r.time),
    include_flight: [
      r.airline,
      r.flight_number,
      r.flight_date,
      r.flight_time,
      r.return_airline,
      r.return_flight_number,
    ].some(Boolean),
    airline: r.airline ?? "",
    flight_number: r.flight_number ?? "",
    flight_date: r.flight_date ?? "",
    flight_time: hhmm(r.flight_time),
    return_date: r.return_date ?? "",
    return_time: hhmm(r.return_time),
    return_time_pending: r.service_type === "redondo" && !r.return_time,
    return_pickup_point: r.return_pickup_point ?? "",
    return_dropoff_point: r.return_dropoff_point ?? "",
    return_airline: r.return_airline ?? "",
    return_flight_number: r.return_flight_number ?? "",
    price: r.price == null ? "" : String(r.price),
    deposit: r.deposit ? String(r.deposit) : "",
    currency: r.currency,
    payment_method: r.payment_method ?? "",
    notes: r.notes ?? "",
  };
}

// Duplicar conserva cliente, ruta, servicio y pago; las fechas y horas se capturan de nuevo.
export function formValuesForDuplicate(
  r: ReservationWithRelations,
): ReservationFormValues {
  return {
    ...formValuesFromReservation(r),
    date: "",
    time: "",
    flight_date: "",
    flight_time: "",
    return_date: "",
    return_time: "",
    deposit: "",
  };
}
