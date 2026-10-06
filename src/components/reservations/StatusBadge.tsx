import { clsx } from "clsx";
import type { ReservationStatus } from "@/types/database.types";

export const statusLabels: Record<ReservationStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  confirmed: "Confirmado",
  in_service: "En servicio",
  completed: "Completado",
  cancelled: "Cancelado",
};

// El ticket (vista previa y PDF) es un documento para el cliente y va en inglés.
const labelsEn: Record<ReservationStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
};

const classes: Record<ReservationStatus, string> = {
  draft: "bg-carbon-700 text-ink-700",
  pending: "bg-pending-50 text-pending-500",
  confirmed: "bg-positive-50 text-positive-700",
  in_service: "bg-gold-300/40 text-gold-700",
  completed: "bg-positive-50 text-positive-700",
  cancelled: "bg-danger-50 text-danger-500",
};

export function StatusBadge({
  status,
  lang = "es",
}: {
  status: ReservationStatus;
  lang?: "es" | "en";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        classes[status],
      )}
    >
      {lang === "en" ? labelsEn[status] : statusLabels[status]}
    </span>
  );
}
