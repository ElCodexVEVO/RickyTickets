import { format, parseISO, type Locale } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { CurrencyCode } from "@/types/database.types";

export function formatCurrency(amount: number | null | undefined, currency: CurrencyCode = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// Idioma de la interfaz interna (dashboard, reservaciones, etc).
export function formatDate(value: string | null | undefined, pattern = "d MMM yyyy", locale: Locale = es) {
  if (!value) return "—";
  try {
    return format(parseISO(value), pattern, { locale });
  } catch {
    return value;
  }
}

// El ticket (vista previa y PDF) es un documento para el cliente y siempre va en inglés.
export function formatTicketDate(value: string | null | undefined, pattern = "d MMM yyyy") {
  return formatDate(value, pattern, enUS);
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const [hh, mm] = value.split(":");
  const date = new Date();
  date.setHours(Number(hh), Number(mm));
  return format(date, "h:mm a");
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
