import type {
  CurrencyCode,
  ReservationStatus,
  ServiceType,
} from "@/types/database.types";

// Forma normalizada de los datos de un ticket, compartida por la vista previa en
// vivo (HTML) y la plantilla PDF real (@react-pdf/renderer), para que nunca se
// desincronicen entre sí.
export interface TicketData {
  folio: string;
  status: ReservationStatus;
  customerName: string;
  phone: string;
  email?: string;
  serviceLabel?: string;
  pickupPoint: string;
  dropoffPoint: string;
  hotel?: string;
  room?: string;
  passengers: number;
  date?: string;
  time?: string;
  airline?: string;
  flightNumber?: string;
  flightDate?: string;
  flightTime?: string;
  serviceType: ServiceType;
  returnDate?: string;
  // Sin hora en un trayecto redondo = «Por determinar».
  returnTime?: string;
  returnPickupPoint?: string;
  returnDropoffPoint?: string;
  returnAirline?: string;
  returnFlightNumber?: string;
  price?: number;
  // undefined = reservación anterior sin registro de anticipo.
  deposit?: number;
  currency: CurrencyCode;
  paymentMethod?: string;
  notes?: string;
}
