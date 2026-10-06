import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type { ReservationRow } from "@/types/database.types";
import type { TicketData } from "@/types/domain";

export function ticketDataFromForm(values: ReservationFormValues): TicketData {
  return {
    folio: "Assigned when saved",
    status: "pending",
    customerName: values.customer_full_name || "Customer Name",
    phone: values.customer_phone,
    email: values.customer_email || undefined,
    pickupPoint: values.pickup_point,
    dropoffPoint: values.dropoff_point,
    hotel: values.hotel || undefined,
    room: values.room || undefined,
    passengers: values.passengers || 1,
    date: values.date || undefined,
    time: values.time || undefined,
    airline: values.airline || undefined,
    flightNumber: values.flight_number || undefined,
    serviceType: values.service_type,
    returnDate: values.return_date || undefined,
    returnTime: values.return_time_pending
      ? undefined
      : values.return_time || undefined,
    returnPickupPoint: values.return_pickup_point || undefined,
    returnDropoffPoint: values.return_dropoff_point || undefined,
    returnAirline: values.return_airline || undefined,
    returnFlightNumber: values.return_flight_number || undefined,
    price: values.price ? Number(values.price) : undefined,
    currency: values.currency,
  };
}

export function ticketDataFromReservation(
  reservation: ReservationRow,
  customer: { full_name: string; phone: string | null; email: string | null },
): TicketData {
  return {
    folio: reservation.folio,
    status: reservation.status,
    customerName: customer.full_name,
    phone: customer.phone ?? "",
    email: customer.email ?? undefined,
    pickupPoint: reservation.pickup_point,
    dropoffPoint: reservation.dropoff_point,
    hotel: reservation.hotel ?? undefined,
    room: reservation.room ?? undefined,
    passengers: reservation.passengers,
    date: reservation.date,
    time: reservation.time,
    airline: reservation.airline ?? undefined,
    flightNumber: reservation.flight_number ?? undefined,
    serviceType: reservation.service_type,
    returnDate: reservation.return_date ?? undefined,
    returnTime: reservation.return_time ?? undefined,
    returnPickupPoint: reservation.return_pickup_point ?? undefined,
    returnDropoffPoint: reservation.return_dropoff_point ?? undefined,
    returnAirline: reservation.return_airline ?? undefined,
    returnFlightNumber: reservation.return_flight_number ?? undefined,
    price: reservation.price ?? undefined,
    currency: reservation.currency,
  };
}
