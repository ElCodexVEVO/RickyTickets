import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type { ReservationRow } from "@/types/database.types";
import type { TicketData } from "@/types/domain";
import { joinPhone } from "@/lib/phone";
import { toAmount } from "@/lib/payments";

export function ticketDataFromForm(
  values: ReservationFormValues,
  serviceLabel?: string,
): TicketData {
  const flight = values.include_flight;
  const roundTrip = values.service_type === "redondo";
  return {
    folio: "Assigned when saved",
    status: "pending",
    customerName: values.customer_full_name || "Customer Name",
    phone: joinPhone(values.phone_country, values.customer_phone),
    email: values.customer_email || undefined,
    serviceLabel,
    pickupPoint: values.pickup_point,
    dropoffPoint: values.dropoff_point,
    hotel: values.hotel || undefined,
    room: values.room || undefined,
    passengers: values.passengers || 1,
    date: values.date || undefined,
    time: values.time || undefined,
    airline: (flight && values.airline) || undefined,
    flightNumber: (flight && values.flight_number) || undefined,
    flightDate: (flight && values.flight_date) || undefined,
    flightTime: (flight && values.flight_time) || undefined,
    serviceType: values.service_type,
    returnDate: (roundTrip && values.return_date) || undefined,
    returnTime:
      roundTrip && !values.return_time_pending
        ? values.return_time || undefined
        : undefined,
    returnPickupPoint: (roundTrip && values.return_pickup_point) || undefined,
    returnDropoffPoint: (roundTrip && values.return_dropoff_point) || undefined,
    returnAirline: (roundTrip && flight && values.return_airline) || undefined,
    returnFlightNumber:
      (roundTrip && flight && values.return_flight_number) || undefined,
    price: toAmount(values.price) ?? undefined,
    deposit: toAmount(values.deposit) ?? 0,
    currency: values.currency,
    paymentMethod: values.payment_method || undefined,
    notes: values.notes || undefined,
  };
}

export function ticketDataFromReservation(
  reservation: ReservationRow,
  customer: { full_name: string; phone: string | null; email: string | null },
  serviceLabel?: string,
): TicketData {
  return {
    folio: reservation.folio,
    status: reservation.status,
    customerName: customer.full_name,
    phone: customer.phone ?? "",
    email: customer.email ?? undefined,
    serviceLabel,
    pickupPoint: reservation.pickup_point,
    dropoffPoint: reservation.dropoff_point,
    hotel: reservation.hotel ?? undefined,
    room: reservation.room ?? undefined,
    passengers: reservation.passengers,
    date: reservation.date,
    time: reservation.time,
    airline: reservation.airline ?? undefined,
    flightNumber: reservation.flight_number ?? undefined,
    flightDate: reservation.flight_date ?? undefined,
    flightTime: reservation.flight_time ?? undefined,
    serviceType: reservation.service_type,
    returnDate: reservation.return_date ?? undefined,
    returnTime: reservation.return_time ?? undefined,
    returnPickupPoint: reservation.return_pickup_point ?? undefined,
    returnDropoffPoint: reservation.return_dropoff_point ?? undefined,
    returnAirline: reservation.return_airline ?? undefined,
    returnFlightNumber: reservation.return_flight_number ?? undefined,
    price: reservation.price ?? undefined,
    deposit: reservation.deposit ?? undefined,
    currency: reservation.currency,
    paymentMethod: reservation.payment_method ?? undefined,
    notes: reservation.notes ?? undefined,
  };
}
