import type { ReservationLocationFields, ReservationWithRelations } from "@/types/database.types";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import { validGeoPoint, type OperationsGeography, type GeoPoint } from "@/lib/operationsMap";
export const locationPrefixes = ["origin", "destination", "return_origin", "return_destination"] as const;
export type LocationPrefix = typeof locationPrefixes[number];
export const locationFields = locationPrefixes.flatMap(p => [`${p}_lat`, `${p}_lng`, `${p}_address`] as const);
export function reservationLocationDefaults(row: ReservationLocationFields): ReservationLocationFields {
  return Object.fromEntries(locationFields.map(key => [key, row[key] ?? null]));
}
export function reservationLocationPayload(values: ReservationFormValues): ReservationLocationFields {
  return Object.fromEntries(locationPrefixes.flatMap(p => {
    const enabled = !p.startsWith("return_") || values.service_type === "redondo";
    return [[`${p}_lat`, enabled ? values[`${p}_lat`] ?? null : null], [`${p}_lng`, enabled ? values[`${p}_lng`] ?? null : null], [`${p}_address`, enabled ? values[`${p}_address`] || null : null]];
  }));
}
export function locationPoint(row: ReservationLocationFields, prefix: LocationPrefix): GeoPoint | undefined {
  const latitude = row[`${prefix}_lat`];
  const longitude = row[`${prefix}_lng`];
  if (latitude == null || longitude == null) return undefined;
  const point = { latitude, longitude };
  return validGeoPoint(point) ? point : undefined;
}
export function reservationGeography(rows: ReservationWithRelations[]): OperationsGeography {
  return Object.fromEntries(rows.flatMap(r => [
    [`${r.id}-out`, { origin: locationPoint(r, "origin"), destination: locationPoint(r, "destination") }],
    [`${r.id}-back`, { origin: locationPoint(r, "return_origin"), destination: locationPoint(r, "return_destination") }],
  ]));
}
