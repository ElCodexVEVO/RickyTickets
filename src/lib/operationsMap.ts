import {
  operationClock,
  operationDate,
  serviceLegs,
  type OperationAlert,
  type ServiceLeg,
} from "@/lib/operations";
import type { ReservationWithRelations } from "@/types/database.types";

export type MapStateFilter =
  "all" | "upcoming" | "en_route" | "in_service" | "pending";
export type MapTimeFilter = "today" | "next2h" | "day";
export interface MapFilters {
  state: MapStateFilter;
  period: MapTimeFilter;
  date: string;
}
export type OperationsService = ServiceLeg;
export interface GeoPoint {
  latitude: number;
  longitude: number;
}
// Adapter contract: resolved coordinates must come from a verified, persisted source.
export interface ServiceGeography {
  origin?: GeoPoint;
  destination?: GeoPoint;
  route?: { type: "LineString"; coordinates: [number, number][] };
}
export type OperationsGeography = Readonly<Record<string, ServiceGeography>>;
export const mapStates = {
  scheduled: { label: "Programado", color: "#7bb2f5" },
  pending: { label: "Por confirmar", color: "#e1bd68" },
  in_service: { label: "En servicio", color: "#75d4a7" },
  completed: { label: "Completado", color: "#a6afb4" },
};
export function serviceMapState(service: ServiceLeg) {
  const r = service.reservation;
  if (r.status === "completed") return mapStates.completed;
  if (r.status === "in_service") return mapStates.in_service;
  return r.status === "pending" ? mapStates.pending : mapStates.scheduled;
}
export function operationsServices(
  reservations: ReservationWithRelations[],
): OperationsService[] {
  return serviceLegs(
    reservations.filter((r) => !r.deleted_at && r.status !== "cancelled"),
  );
}
function localMinute(date: string, time: string) {
  return (
    Date.parse(`${date}T00:00:00Z`) / 60000 +
    Number(time.slice(0, 2)) * 60 +
    Number(time.slice(3, 5))
  );
}
export function filterOperationsServices(
  services: OperationsService[],
  filters: MapFilters,
  now: Date,
): OperationsService[] {
  const minute = localMinute(operationDate(now), operationClock(now));
  return services.filter((s) => {
    const r = s.reservation;
    if (filters.period === "next2h") {
      if (!s.time || r.status === "completed") return false;
      const start = localMinute(s.date, s.time);
      if (start < minute || start > minute + 120) return false;
    } else {
      if (
        s.date !==
        (filters.period === "today" ? operationDate(now) : filters.date)
      )
        return false;
      if (filters.period === "today" && r.status === "completed") return false;
    }
    if (filters.state === "en_route") return false; // Not recorded by the current database.
    if (filters.state === "in_service") return r.status === "in_service";
    if (filters.state === "pending") return r.status === "pending";
    if (filters.state === "upcoming") {
      return (
        ["confirmed", "pending"].includes(r.status) &&
        !!s.time &&
        localMinute(s.date, s.time) >= minute
      );
    }
    return true;
  });
}
export function alertServiceKey(
  alert: OperationAlert,
  services: ServiceLeg[],
  today: string,
): string | undefined {
  if (!alert.reservationId) return undefined;
  const candidates = services.filter(
    (s) =>
      !s.reservation.deleted_at &&
      !["completed", "cancelled"].includes(s.reservation.status) &&
      s.reservation.id === alert.reservationId,
  );
  if (alert.kind === "return_pending")
    return (
      candidates.find((s) => s.direction === "Regreso")?.key ??
      candidates[0]?.key
    );
  return candidates.find((s) => s.date >= today)?.key ?? candidates[0]?.key;
}
export function validGeoPoint(point?: GeoPoint): point is GeoPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function validRoute(
  route?: ServiceGeography["route"],
): route is NonNullable<ServiceGeography["route"]> {
  return (
    !!route &&
    route.type === "LineString" &&
    Array.isArray(route.coordinates) &&
    route.coordinates.length >= 2 &&
    route.coordinates.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        validGeoPoint({ latitude: point[1], longitude: point[0] }),
    )
  );
}
export function hasGeography(geography?: ServiceGeography) {
  return (
    validGeoPoint(geography?.origin) ||
    validGeoPoint(geography?.destination) ||
    validRoute(geography?.route)
  );
}
