import type { ReservationWithRelations } from "@/types/database.types";

export const OPERATION_TIME_ZONE = "America/Cancun";
export function operationDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function operationClock(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: OPERATION_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
export function returnTimeLabel(
  value: string | null | undefined,
  serviceType = "redondo",
) {
  return serviceType !== "redondo"
    ? "Solo ida"
    : value
      ? value.slice(0, 5)
      : "Por determinar";
}
// Un borrador todavía no es un servicio: no entra en agenda, mapa, alertas ni reportes.
export function isDraft(r: Pick<ReservationWithRelations, "status">) {
  return r.status === "draft";
}
export interface ServiceLeg {
  key: string;
  reservation: ReservationWithRelations;
  direction: "Ida" | "Regreso";
  date: string;
  time: string | null;
  pickup: string;
  dropoff: string;
  flight: string | null;
}
export function serviceLegs(
  reservations: ReservationWithRelations[],
): ServiceLeg[] {
  return reservations
    .filter((r) => !isDraft(r))
    .flatMap((r) => {
      const legs: ServiceLeg[] = [
        {
          key: `${r.id}-out`,
          reservation: r,
          direction: "Ida",
          date: r.date,
          time: r.time,
          pickup: r.pickup_point,
          dropoff: r.dropoff_point,
          flight: r.flight_number,
        },
      ];
      if (r.service_type === "redondo" && r.return_date)
        legs.push({
          key: `${r.id}-back`,
          reservation: r,
          direction: "Regreso",
          date: r.return_date,
          time: r.return_time,
          pickup: r.return_pickup_point || r.dropoff_point,
          dropoff: r.return_dropoff_point || r.pickup_point,
          flight: r.return_flight_number,
        });
      return legs;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time ?? "99:99").localeCompare(b.time ?? "99:99"),
    );
}
export interface OperationAlert {
  key: string;
  title: string;
  description: string;
  reservationId?: string;
  kind?: "pending" | "return_pending";
}
export function operationAlerts(
  reservations: ReservationWithRelations[],
  from = operationDate(),
): OperationAlert[] {
  const current = reservations.filter(
    (r) =>
      !r.deleted_at &&
      !isDraft(r) &&
      !["completed", "cancelled"].includes(r.status) &&
      (r.date >= from || (r.return_date && r.return_date >= from)),
  );
  const alerts: OperationAlert[] = [];
  for (const r of current) {
    if (r.status === "pending")
      alerts.push({
        key: `${r.id}-pending`,
        kind: "pending",
        title: "Reservación pendiente",
        description: `${r.folio} · ${r.customer?.full_name ?? "Cliente"}`,
        reservationId: r.id,
      });
    if (r.service_type === "redondo" && !r.return_time)
      alerts.push({
        key: `${r.id}-return`,
        kind: "return_pending",
        title: "Hora de regreso por determinar",
        description: `${r.folio} · ${r.return_date ?? "Fecha pendiente"}`,
        reservationId: r.id,
      });
  }
  return alerts;
}
