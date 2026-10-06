import airlines from "@/data/airlines.json";

// Archivos estáticos de public/assets/rickytickets. BASE_URL mantiene las rutas
// válidas en desarrollo, preview y Vercel aunque cambie la base del build.
const base = `${import.meta.env.BASE_URL}assets/rickytickets`;

export const serviceIcons = {
  airport: `${base}/services/airport.svg`,
  hotel: `${base}/services/hotel.svg`,
  tour: `${base}/services/tour.svg`,
  transfer: `${base}/services/transfer.svg`,
  custom: `${base}/services/custom.svg`,
} as const;

export const paymentIcons = {
  cash: `${base}/payments/cash.svg`,
  card: `${base}/payments/card.svg`,
  transfer: `${base}/payments/transfer.svg`,
} as const;

export const statusIcons = {
  draft: `${base}/status/draft.svg`,
  pending: `${base}/status/pending.svg`,
  partial: `${base}/status/partial.svg`,
  paid: `${base}/status/paid.svg`,
  unknownTime: `${base}/status/unknown-time.svg`,
} as const;

export const airlinePlaceholder = `${base}/placeholders/airline-placeholder.svg`;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface AirlineInfo {
  name: string;
  iata: string;
  logo: string;
}

export const knownAirlines: AirlineInfo[] = airlines.map((a) => ({
  name: a.name,
  iata: a.iata,
  logo: `${base}/airlines/${a.filename}`,
}));

// Coincide con el nombre, el código IATA o un alias de mapping/airlines.json. Si la
// aerolínea está vacía, usa el prefijo IATA del número de vuelo («Y4 123»).
export function findAirline(
  airline?: string | null,
  flightNumber?: string | null,
): AirlineInfo | undefined {
  const byName = normalize(airline ?? "");
  const byFlight = normalize(flightNumber ?? "").match(/^([a-z0-9]{2})\s*\d/);
  const index = airlines.findIndex((a) =>
    byName
      ? [a.name, a.iata, ...a.aliases].some((v) => normalize(v) === byName)
      : !!byFlight && normalize(a.iata) === byFlight[1],
  );
  return index < 0 ? undefined : knownAirlines[index];
}

export type ServiceKind =
  | "arrival"
  | "departure"
  | "airport"
  | "hotel"
  | "tour"
  | "transfer"
  | "custom";

// Clasifica un servicio del catálogo por nombre o código. Con aeropuerto y hotel,
// el orden indica la dirección: «Aeropuerto → Hotel» es llegada; «Hotel → Aeropuerto», salida.
export function serviceKind(item: {
  code: string | null;
  label: string;
}): ServiceKind {
  const kind = (text: string): ServiceKind | undefined => {
    const airport = text.search(/aeropuerto|airport/);
    const hotel = text.search(/hotel/);
    if (/llegada|arrival/.test(text)) return "arrival";
    if (/salida|departure/.test(text)) return "departure";
    if (airport >= 0 && hotel >= 0)
      return airport < hotel ? "arrival" : "departure";
    if (airport >= 0) return "airport";
    if (hotel >= 0) return "hotel";
    if (/tour/.test(text)) return "tour";
    if (/traslado|transfer/.test(text)) return "transfer";
    return undefined;
  };
  return (
    kind(normalize(item.label)) ?? kind(normalize(item.code ?? "")) ?? "custom"
  );
}

export function paymentIconFor(method?: string | null): string | undefined {
  const text = normalize(method ?? "");
  if (/efectivo|cash/.test(text)) return paymentIcons.cash;
  if (/tarjeta|card/.test(text)) return paymentIcons.card;
  if (/transfer/.test(text)) return paymentIcons.transfer;
  return undefined;
}
