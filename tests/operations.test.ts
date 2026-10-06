import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
import {
  reservationFormDefaults,
  reservationFormSchema,
} from "@/lib/validators/reservationSchema";
import { reservationPayload } from "@/features/reservations/api";
import {
  returnTimeLabel,
  serviceLegs,
  assignmentWarnings,
  operationDate,
} from "@/lib/operations";
import { reportSummary, csvCell } from "@/lib/reports";
import { ticketDataFromForm } from "@/pdf/buildTicketData";
import type {
  ReservationWithRelations,
  VehicleRow,
} from "@/types/database.types";
const values = {
  ...reservationFormDefaults,
  customer_full_name: "Cliente aislado",
  customer_phone: "9991234567",
  pickup_point: "Origen",
  dropoff_point: "Destino",
  date: "2026-10-06",
  time: "10:30",
  service_type: "redondo" as const,
  return_date: "2026-10-07",
  return_pickup_point: "Destino",
  return_dropoff_point: "Origen",
};
const row = (
  overrides: Partial<ReservationWithRelations> = {},
): ReservationWithRelations => ({
  id: "r1",
  folio: "DT-2026-TEST",
  customer_id: "c1",
  customer: null,
  vehicle: null,
  driver: null,
  service_type: "redondo",
  pickup_point: "Origen",
  dropoff_point: "Destino",
  hotel: null,
  room: null,
  date: "2026-10-06",
  time: "10:30:00",
  airline: null,
  flight_number: null,
  flight_date: null,
  return_date: "2026-10-07",
  return_time: null,
  return_pickup_point: "Destino",
  return_dropoff_point: "Origen",
  return_airline: null,
  return_flight_number: null,
  passengers: 7,
  price: 100,
  currency: "USD",
  payment_method: null,
  notes: null,
  vehicle_id: null,
  driver_id: null,
  status: "confirmed",
  created_by: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  deleted_at: null,
  ...overrides,
});
describe("Contrato de regreso y operación", () => {
  it("acepta pendiente y elimina horas residuales del payload y preview", () => {
    const pending = {
      ...values,
      return_time: "16:30",
      return_time_pending: true,
    };
    expect(reservationFormSchema.safeParse(pending).success).toBe(true);
    expect(reservationPayload(pending).return_time).toBeNull();
    expect(ticketDataFromForm(pending).returnTime).toBeUndefined();
  });
  it("requiere hora cuando el operador desactiva Por determinar", () => {
    expect(reservationFormSchema.safeParse(values).success).toBe(false);
    expect(
      reservationFormSchema.safeParse({ ...values, return_time: "16:30" })
        .success,
    ).toBe(true);
    expect(
      reservationFormSchema.safeParse({ ...values, return_time: "0" }).success,
    ).toBe(false);
  });
  it("solo ida limpia todos los datos de regreso", () => {
    const payload = reservationPayload({
      ...values,
      service_type: "sencillo",
      return_time: "16:30",
    });
    expect(payload.return_time).toBeNull();
    expect(payload.return_date).toBeNull();
  });
  it("no reinterpreta una medianoche histórica como pendiente", () => {
    expect(returnTimeLabel(null)).toBe("Por determinar");
    expect(returnTimeLabel("00:00:00")).toBe("00:00");
  });
  it("agenda cuenta el regreso sin asignarle un horario falso", () => {
    const legs = serviceLegs([row()]);
    expect(legs).toHaveLength(2);
    expect(legs[1].date).toBe("2026-10-07");
    expect(legs[1].time).toBeNull();
  });
  it("advierte capacidad y proximidad entre días y omite cancelaciones", () => {
    const vehicle = {
      id: "v1",
      brand: "Marca",
      model: "Modelo",
      capacity: 6,
      status: "available",
    } as VehicleRow;
    const other = row({
      id: "r2",
      vehicle_id: "v1",
      date: "2026-10-06",
      time: "23:30",
      service_type: "sencillo",
    });
    const warnings = assignmentWarnings(
      { date: "2026-10-07", time: "00:30", passengers: 7, vehicle_id: "v1" },
      [other],
      [vehicle],
      [],
    );
    expect(warnings.some((w) => w.includes("Capacidad insuficiente"))).toBe(
      true,
    );
    expect(warnings.some((w) => w.includes("ya está asignado"))).toBe(true);
    expect(
      assignmentWarnings(
        { date: "2026-10-07", time: "00:30", passengers: 1, vehicle_id: "v1" },
        [{ ...other, status: "cancelled" }],
        [vehicle],
        [],
      ),
    ).toHaveLength(0);
  });
  it("usa la fecha real de Quintana Roo aunque el host esté en UTC", () => {
    expect(operationDate(new Date("2026-10-06T02:00:00Z"))).toBe("2026-10-05");
  });
  it("separa monedas y no convierte cancelaciones en ingresos", () => {
    const report = reportSummary(
      [
        row(),
        row({ id: "r2", currency: "MXN", price: 2000 }),
        row({ id: "r3", price: 500, status: "cancelled" }),
      ],
      "2026-10-01",
      "2026-10-31",
      "USD",
    );
    expect(report.total).toBe(100);
    expect(report.cancellations).toBe(1);
    expect(report.average).toBe(100);
  });
  it("neutraliza fórmulas peligrosas al exportar CSV", () => {
    expect(csvCell('=HYPERLINK("x")')).toContain("'=HYPERLINK");
    expect(csvCell("Texto, normal")).toBe('"Texto, normal"');
  });
});
