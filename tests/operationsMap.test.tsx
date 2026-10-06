// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type {
  ReservationWithRelations,
  VehicleRow,
} from "@/types/database.types";
const mocks = vi.hoisted(() => ({
  canEdit: true,
  update: vi.fn(async (_payload: unknown) => ({})),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ canEditReservations: mocks.canEdit }),
}));
vi.mock("@/features/reservations/hooks", () => ({
  useUpdateReservationStatus: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
}));
vi.mock("@/features/settings/hooks", () => ({
  useCompanySettings: () => ({ data: { meetingPoints: {} } }),
}));
import { OperationsMap } from "@/components/operations/OperationsMap";
import {
  operationsServices,
  filterOperationsServices,
  alertServiceKey,
  validGeoPoint,
  validRoute,
  type MapFilters,
  type OperationsGeography,
} from "@/lib/operationsMap";
import { operationAlerts } from "@/lib/operations";
const now = new Date("2026-10-06T15:00:00Z");
function row(
  overrides: Partial<ReservationWithRelations> = {},
): ReservationWithRelations {
  return {
    id: "local",
    folio: "LOCAL-001",
    customer_id: "local-customer",
    customer: {
      id: "local-customer",
      full_name: "Cliente local",
      phone: "+529990000000",
      email: null,
    },
    driver: null,
    vehicle: null,
    service_type: "sencillo",
    pickup_point: "Origen local",
    dropoff_point: "Destino local",
    hotel: null,
    room: null,
    date: "2026-10-06",
    time: "10:30",
    airline: null,
    flight_number: null,
    flight_date: null,
    return_date: null,
    return_time: null,
    return_pickup_point: null,
    return_dropoff_point: null,
    return_airline: null,
    return_flight_number: null,
    passengers: 2,
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
  };
}
const filters = (overrides: Partial<MapFilters> = {}): MapFilters => ({
  state: "all",
  period: "today",
  date: "2026-10-06",
  ...overrides,
});
beforeEach(() => {
  mocks.canEdit = true;
  mocks.update.mockReset().mockResolvedValue({});
});
afterEach(cleanup);
function mount(reservations = [row()], geography?: OperationsGeography) {
  return render(
    <MemoryRouter>
      <OperationsMap
        reservations={reservations}
        vehicles={[]}
        drivers={[]}
        now={now}
        geography={geography}
      />
    </MemoryRouter>,
  );
}
describe("Mapa de operaciones con datos aislados", () => {
  it("excluye cancelados y borrados; Hoy excluye completados y Todo el día los conserva", () => {
    const services = operationsServices(
      [
        row(),
        row({ id: "completed", status: "completed" }),
        row({ id: "cancelled", status: "cancelled" }),
        row({ id: "deleted", deleted_at: "2026-10-06T00:00Z" }),
      ],
      [],
      [],
    );
    expect(services.map((s) => s.reservation.id)).toEqual([
      "local",
      "completed",
    ]);
    expect(
      filterOperationsServices(services, filters(), now).map(
        (s) => s.reservation.id,
      ),
    ).toEqual(["local"]);
    expect(
      filterOperationsServices(services, filters({ period: "day" }), now),
    ).toHaveLength(2);
  });
  it("Próximas 2 h cruza medianoche y no inventa hora para el regreso", () => {
    const services = operationsServices(
      [
        row({
          time: "23:45",
          service_type: "redondo",
          return_date: "2026-10-07",
          return_time: null,
        }),
        row({ id: "tomorrow", date: "2026-10-07", time: "00:30" }),
        row({ id: "outside", date: "2026-10-07", time: "02:00" }),
      ],
      [],
      [],
    );
    const result = filterOperationsServices(
      services,
      filters({ period: "next2h" }),
      new Date("2026-10-07T04:30:00Z"),
    );
    expect(result.map((s) => s.key)).toEqual(["local-out", "tomorrow-out"]);
  });
  it("filtra asignación y estado real sin convertir confirmados en En camino", () => {
    const services = operationsServices(
      [
        row(),
        row({
          id: "assigned",
          driver_id: "d1",
          vehicle_id: "v1",
          time: "12:00",
        }),
        row({ id: "active", status: "in_service", time: "09:00" }),
        row({ id: "past", time: "09:30" }),
      ],
      [],
      [],
    );
    expect(
      filterOperationsServices(
        services,
        filters({ state: "in_service" }),
        now,
      ).map((s) => s.key),
    ).toEqual(["active-out"]);
    expect(
      filterOperationsServices(services, filters({ state: "unassigned" }), now),
    ).toHaveLength(3);
    expect(
      filterOperationsServices(services, filters({ state: "upcoming" }), now),
    ).toHaveLength(2);
    expect(
      filterOperationsServices(services, filters({ state: "en_route" }), now),
    ).toHaveLength(0);
  });
  it("enlaza alertas de regreso pendiente y mantenimiento con el trayecto adecuado", () => {
    const r = row({
      service_type: "redondo",
      return_date: "2026-10-07",
      vehicle_id: "v1",
    });
    const v = {
      id: "v1",
      brand: "Marca",
      model: "Unidad",
      plate: "LOCAL",
      capacity: 6,
      status: "maintenance",
    } as VehicleRow;
    const services = operationsServices([r], [v], []);
    const alerts = operationAlerts([r], [v], [], "2026-10-06");
    expect(
      alertServiceKey(
        alerts.find((a) => a.kind === "return_pending")!,
        services,
        "2026-10-06",
      ),
    ).toBe("local-back");
    expect(
      alertServiceKey(
        alerts.find((a) => a.kind === "maintenance")!,
        services,
        "2026-10-06",
      ),
    ).toBe("local-out");
    expect(
      operationAlerts([row()], [], [], "2026-10-06").some(
        (a) => a.kind === "vehicle_missing",
      ),
    ).toBe(true);
  });
  it("rechaza coordenadas no finitas/fuera de rango y geometrías incompletas", () => {
    expect(validGeoPoint({ latitude: NaN, longitude: 0 })).toBe(false);
    expect(validGeoPoint({ latitude: 20, longitude: 181 })).toBe(false);
    expect(validGeoPoint({ latitude: 91, longitude: -87 })).toBe(false);
    expect(validRoute({ type: "LineString", coordinates: [[-87, 20]] })).toBe(
      false,
    );
    expect(
      validRoute({
        type: "LineString",
        coordinates: [
          [-87, 20],
          [-86, 21],
        ],
      }),
    ).toBe(true);
  });
  it("seleccionar sin coordenadas muestra datos, acciones y ubicación pendiente sin guardar", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /LOCAL-001 · Ida/ }));
    const detail = screen.getByRole("region", {
      name: /Detalle del servicio LOCAL-001/,
    });
    expect(within(detail).getByText("Cliente local")).toBeTruthy();
    expect(within(detail).getByText("Sin conductor")).toBeTruthy();
    expect(within(detail).getByText("Sin vehículo")).toBeTruthy();
    expect(within(detail).getByText("Ubicación pendiente")).toBeTruthy();
    expect(
      within(detail)
        .getByRole("link", { name: "Ver reservación" })
        .getAttribute("href"),
    ).toBe("/reservaciones/local");
    expect(mocks.update).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.selectOptions(
      screen.getByLabelText("Nuevo estado"),
      "in_service",
    );
    expect(mocks.update).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Aplicar cambio" }));
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      id: "local",
      status: "in_service",
    });
  });
  it("no presenta edición ni cambio de estado sin permiso", async () => {
    mocks.canEdit = false;
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /LOCAL-001 · Ida/ }));
    expect(screen.queryByRole("button", { name: "Cambiar estado" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Editar" })).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("un error de actualización conserva el diálogo y no muestra éxito", async () => {
    mocks.update.mockRejectedValueOnce(
      new Error("Sin permiso para actualizar"),
    );
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: /LOCAL-001 · Ida/ }));
    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.selectOptions(
      screen.getByLabelText("Nuevo estado"),
      "completed",
    );
    await user.click(screen.getByRole("button", { name: "Aplicar cambio" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Sin permiso para actualizar",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
  it("una alerta de otra fecha selecciona el regreso pendiente y ajusta el periodo", () => {
    const r = row({
      service_type: "redondo",
      return_date: "2026-10-07",
      return_time: null,
    });
    render(
      <MemoryRouter>
        <OperationsMap
          reservations={[r]}
          vehicles={[]}
          drivers={[]}
          now={now}
          focusRequest={{ legKey: "local-back", sequence: 1 }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Fecha de operaciones")).toHaveProperty(
      "value",
      "2026-10-07",
    );
    expect(screen.getByLabelText("Periodo de servicios")).toHaveProperty(
      "value",
      "day",
    );
    const detail = screen.getByRole("region", {
      name: "Detalle del servicio LOCAL-001 · Regreso",
    });
    expect(within(detail).getByText(/Por determinar/)).toBeTruthy();
  });
  it("coordina hover, selección por teclado y dibuja solo geometría recibida", async () => {
    const g: OperationsGeography = {
      "local-out": {
        origin: { latitude: 20.2, longitude: -87.4 },
        destination: { latitude: 21.1, longitude: -86.8 },
      },
    };
    const user = userEvent.setup();
    const view = mount([row()], g);
    expect(view.container.querySelector("polyline")).toBeNull();
    const marker = screen.getByRole("button", {
      name: "Origen de LOCAL-001 · Ida",
    });
    await user.hover(
      screen.getByRole("button", { name: /LOCAL-001 · Ida · Origen local a/ }),
    );
    expect(marker.parentElement?.getAttribute("data-highlighted")).toBe("true");
    fireEvent.keyDown(marker, { key: "Enter" });
    expect(
      screen.getByRole("region", { name: /Detalle del servicio LOCAL-001/ }),
    ).toBeTruthy();
    const route = {
      ...g,
      "local-out": {
        ...g["local-out"],
        route: {
          type: "LineString" as const,
          coordinates: [
            [-87.4, 20.2],
            [-87, 20.6],
            [-86.8, 21.1],
          ] as [number, number][],
        },
      },
    };
    view.rerender(
      <MemoryRouter>
        <OperationsMap
          reservations={[row()]}
          vehicles={[]}
          drivers={[]}
          now={now}
          geography={route}
        />
      </MemoryRouter>,
    );
    expect(
      view.container.querySelector("polyline")?.getAttribute("stroke-width"),
    ).toBe("4");
  });
  it("los filtros actualizan la lista y explican el estado aún no registrado", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      screen.getByRole("button", { name: "En servicio", exact: true }),
    );
    expect(
      screen.queryByRole("button", { name: /LOCAL-001 · Ida/ }),
    ).toBeNull();
    expect(
      screen.getAllByText("No hay servicios activos en este momento."),
    ).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "En camino", exact: true }),
    );
    expect(
      screen.getAllByText(/El estado En camino aún no se registra/),
    ).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Todos", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: /LOCAL-001 · Ida/ }),
    ).toBeTruthy();
  });
});
