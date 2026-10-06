import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
import {
  reservationDraftSchema,
  reservationFormDefaults,
  reservationFormSchema,
} from "@/lib/validators/reservationSchema";
import { reservationPayload } from "@/features/reservations/api";
import {
  operationAlerts,
  operationDate,
  returnTimeLabel,
  serviceLegs,
} from "@/lib/operations";
import { reportSummary, csvCell, reservationCsv } from "@/lib/reports";
import { paymentSummary } from "@/lib/payments";
import { findAirline, serviceKind } from "@/lib/assets";
import { joinPhone, splitPhone } from "@/lib/phone";
import { ticketDataFromForm } from "@/pdf/buildTicketData";
import type { ReservationWithRelations } from "@/types/database.types";
const values = {
  ...reservationFormDefaults,
  customer_full_name: "Cliente aislado",
  customer_phone: "9991234567",
  pickup_point: "Origen",
  dropoff_point: "Destino",
  date: "2026-10-06",
  time: "10:30",
  price: "100",
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
  deposit: 0,
  currency: "USD",
  payment_method: null,
  notes: null,
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
  it("la fecha de regreso sigue siendo obligatoria con Por determinar", () => {
    const result = reservationFormSchema.safeParse({
      ...values,
      return_date: "",
      return_time_pending: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path[0])).toContain("return_date");
  });
  it("solo ida limpia todos los datos de regreso", () => {
    const payload = reservationPayload({
      ...values,
      service_type: "sencillo",
      return_time: "16:30",
    });
    expect(payload.return_time).toBeNull();
    expect(payload.return_date).toBeNull();
    expect(payload.return_pickup_point).toBeNull();
  });
  it("el borrador admite datos opcionales faltantes pero no la ruta mínima", () => {
    const draft = { ...values, price: "", return_date: "" };
    expect(reservationFormSchema.safeParse(draft).success).toBe(false);
    expect(reservationDraftSchema.safeParse(draft).success).toBe(true);
    expect(
      reservationDraftSchema.safeParse({ ...draft, pickup_point: "" }).success,
    ).toBe(false);
  });
  it("vuelo desactivado y anticipo vacío no envían datos inventados", () => {
    const payload = reservationPayload({
      ...values,
      return_time: "16:30",
      airline: "Volaris",
      flight_time: "09:00",
      include_flight: false,
    });
    expect(payload.airline).toBeNull();
    expect(payload.flight_time).toBeNull();
    expect(payload.deposit).toBe(0);
    expect(payload).not.toHaveProperty("vehicle_id");
    expect(payload).not.toHaveProperty("driver_id");
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
  it("los borradores no entran en agenda, alertas ni reportes", () => {
    const draft = row({ id: "draft", status: "draft", price: 900 });
    expect(serviceLegs([draft])).toHaveLength(0);
    expect(operationAlerts([draft], "2026-10-01")).toHaveLength(0);
    const report = reportSummary(
      [row(), draft],
      "2026-10-01",
      "2026-10-31",
      "USD",
    );
    expect(report.rows.map((r) => r.id)).toEqual(["r1"]);
  });
  it("las alertas ya no dependen de conductor ni vehículo", () => {
    const alerts = operationAlerts([row({ status: "pending" })], "2026-10-01");
    expect(alerts.map((a) => a.kind).sort()).toEqual([
      "pending",
      "return_pending",
    ]);
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
  it("el CSV exporta anticipo y estado de pago sin columnas de flota", () => {
    const csv = reservationCsv([row({ price: 1850, deposit: 500 })]);
    expect(csv).toContain('"Anticipo"');
    expect(csv).toContain('"Restante"');
    expect(csv).toContain('"1350"');
    expect(csv).toContain('"Anticipo","confirmed"');
    expect(csv).not.toMatch(/Conductor|Vehículo/);
  });
});

describe("Pago, aerolíneas y teléfono", () => {
  it("calcula restante y estado automáticamente", () => {
    expect(paymentSummary("1850", "")).toMatchObject({
      remaining: 1850,
      status: "pending",
    });
    expect(paymentSummary("1850", "500")).toMatchObject({
      remaining: 1350,
      status: "partial",
    });
    expect(paymentSummary("1850", "1850")).toMatchObject({
      remaining: 0,
      status: "paid",
    });
    expect(paymentSummary(1850, 2000)).toMatchObject({
      remaining: 0,
      status: "paid",
    });
    expect(paymentSummary("", "300").status).toBe("partial");
  });
  it("reconoce aerolíneas por nombre, IATA, alias o número de vuelo", () => {
    expect(findAirline("Aeromexico")?.name).toBe("Aeroméxico");
    expect(findAirline("vivaaerobus")?.name).toBe("Viva");
    expect(findAirline("AA")?.name).toBe("American Airlines");
    expect(findAirline("", "Y4 123")?.name).toBe("Volaris");
    expect(findAirline("Aerolínea local")).toBeUndefined();
  });
  it("distingue llegada y salida en los servicios de aeropuerto", () => {
    const kind = (label: string, code: string | null = null) =>
      serviceKind({ label, code });
    expect(kind("Aeropuerto → Hotel", "aeropuerto_hotel")).toBe("arrival");
    expect(kind("Hotel → Aeropuerto", "hotel_aeropuerto")).toBe("departure");
    expect(kind("Llegada Tulum")).toBe("arrival");
    expect(kind("Airport transfer")).toBe("airport");
    expect(kind("Tour")).toBe("tour");
    expect(kind("Traslado privado")).toBe("transfer");
    expect(kind("Evento especial")).toBe("custom");
  });
  it("divide y une teléfonos sin alterar números históricos", () => {
    expect(splitPhone("+52 999 123 4567")).toEqual({
      iso: "MX",
      local: "999 123 4567",
    });
    expect(splitPhone("+1 416 555 0100", "CA").iso).toBe("CA");
    expect(splitPhone("9991234567")).toEqual({ iso: "", local: "9991234567" });
    expect(joinPhone("", "9991234567")).toBe("9991234567");
    expect(joinPhone("ES", "612 345 678")).toBe("+34 612 345 678");
  });
});
