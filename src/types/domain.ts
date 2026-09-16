import type { CurrencyCode, ReservationStatus, ServiceType } from "@/types/database.types";

// Forma normalizada de los datos de un ticket, compartida por la vista previa en
// vivo (HTML) y la plantilla PDF real (@react-pdf/renderer), para que nunca se
// desincronicen entre sí.
export interface TicketData {
  folio: string;
  status: ReservationStatus;
  customerName: string;
  phone: string;
  email?: string;
  pickupPoint: string;
  dropoffPoint: string;
  hotel?: string;
  room?: string;
  passengers: number;
  date?: string;
  time?: string;
  airline?: string;
  flightNumber?: string;
  serviceType: ServiceType;
  returnDate?: string;
  returnTime?: string;
  returnPickupPoint?: string;
  returnDropoffPoint?: string;
  returnAirline?: string;
  returnFlightNumber?: string;
  price?: number;
  currency: CurrencyCode;
}
