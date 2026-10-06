import type {
  DriverRow,
  ReservationWithRelations,
  VehicleRow,
} from "@/types/database.types";

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
export interface AssignmentInput {
  id?: string;
  date: string;
  time: string;
  service_type?: string;
  return_date?: string | null;
  return_time?: string | null;
  passengers: number;
  driver_id?: string | null;
  vehicle_id?: string | null;
}
export function assignmentWarnings(
  input: AssignmentInput,
  reservations: ReservationWithRelations[],
  vehicles: VehicleRow[],
  drivers: DriverRow[],
  windowMinutes = 120,
) {
  const warnings = new Set<string>();
  const vehicle = vehicles.find((v) => v.id === input.vehicle_id);
  const driver = drivers.find((d) => d.id === input.driver_id);
  if (vehicle && input.passengers > vehicle.capacity)
    warnings.add(
      `Capacidad insuficiente: ${input.passengers} pasajeros, ${vehicle.capacity} plazas en ${vehicle.brand} ${vehicle.model}.`,
    );
  if (vehicle && ["maintenance", "inactive"].includes(vehicle.status))
    warnings.add(
      `${vehicle.brand} ${vehicle.model} no está disponible (${vehicle.status === "maintenance" ? "mantenimiento" : "fuera de operación"}).`,
    );
  if (driver && ["off_duty", "inactive"].includes(driver.status))
    warnings.add(`${driver.full_name} está fuera de turno o inactivo.`);
  if (
    driver?.vehicle_id &&
    input.vehicle_id &&
    driver.vehicle_id !== input.vehicle_id
  )
    warnings.add("El conductor tiene otro vehículo asignado en su ficha.");
  const slots = [{ date: input.date, time: input.time }];
  if (input.service_type === "redondo" && input.return_date)
    slots.push({ date: input.return_date, time: input.return_time ?? "" });
  const minutes = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const stamp = (date: string, time: string) =>
    Date.parse(`${date}T00:00:00Z`) / 60000 + minutes(time);
  for (const leg of serviceLegs(reservations)) {
    const r = leg.reservation;
    if (r.id === input.id || ["cancelled", "completed"].includes(r.status))
      continue;
    const sameDriver = !!input.driver_id && r.driver_id === input.driver_id;
    const sameVehicle = !!input.vehicle_id && r.vehicle_id === input.vehicle_id;
    if (!sameDriver && !sameVehicle) continue;
    for (const slot of slots) {
      const near =
        slot.time && leg.time
          ? Math.abs(stamp(slot.date, slot.time) - stamp(leg.date, leg.time)) <
            windowMinutes
          : slot.date === leg.date;
      if (!near) continue;
      const schedule = leg.time
        ? `${leg.date} a las ${leg.time.slice(0, 5)}`
        : `${leg.date}, regreso por determinar`;
      if (sameDriver)
        warnings.add(
          `${driver?.full_name ?? "El conductor"} ya tiene ${r.folio} el ${schedule}.`,
        );
      if (sameVehicle)
        warnings.add(
          `${vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : "El vehículo"} ya está asignado a ${r.folio} el ${schedule}.`,
        );
    }
  }
  return Array.from(warnings);
}
export interface OperationAlert {
  key: string;
  title: string;
  description: string;
  reservationId?: string;
  vehicleId?: string;
  kind?:
    | "driver_missing"
    | "vehicle_missing"
    | "return_pending"
    | "assignment"
    | "maintenance";
}
export function operationAlerts(
  reservations: ReservationWithRelations[],
  vehicles: VehicleRow[],
  drivers: DriverRow[],
  from = operationDate(),
): OperationAlert[] {
  const current = reservations.filter(
    (r) =>
      !r.deleted_at &&
      !["completed", "cancelled"].includes(r.status) &&
      (r.date >= from || (r.return_date && r.return_date >= from)),
  );
  const alerts: OperationAlert[] = [];
  for (const r of current) {
    if (!r.driver_id)
      alerts.push({
        key: `${r.id}-driver`,
        kind: "driver_missing",
        title: "Servicio sin conductor",
        description: `${r.folio} · ${r.customer?.full_name ?? "Cliente"}`,
        reservationId: r.id,
      });
    if (!r.vehicle_id)
      alerts.push({
        key: `${r.id}-vehicle`,
        kind: "vehicle_missing",
        title: "Servicio sin vehículo",
        description: `${r.folio} · ${r.customer?.full_name ?? "Cliente"}`,
        reservationId: r.id,
      });
    if (r.status === "pending")
      alerts.push({
        key: `${r.id}-pending`,
        title: "Reservación pendiente",
        description: r.folio,
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
    for (const [index, warning] of assignmentWarnings(
      r,
      current,
      vehicles,
      drivers,
    ).entries())
      alerts.push({
        key: `${r.id}-conflict-${index}`,
        kind: "assignment",
        title: "Revisar asignación",
        description: `${r.folio} · ${warning}`,
        reservationId: r.id,
      });
  }
  for (const v of vehicles.filter((v) => v.status === "maintenance"))
    alerts.push({
      key: `maintenance-${v.id}`,
      kind: "maintenance",
      vehicleId: v.id,
      title: "Vehículo en mantenimiento",
      description: `${v.brand} ${v.model} · ${v.plate}`,
    });
  return alerts;
}
