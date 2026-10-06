// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReservationWithRelations } from "@/types/database.types";

const SERVICE_ID = "00000000-0000-4000-8000-0000000000a1";
const mocks = vi.hoisted(() => ({
  create: vi.fn(async (_input: unknown) => ({
    id: "local-test",
    folio: "QA-LOCAL",
    status: "pending",
    service_type: "sencillo",
    pickup_point: "Origen",
    dropoff_point: "Destino",
    date: "2026-10-06",
    time: "10:30",
    passengers: 1,
    currency: "USD",
  })),
  update: vi.fn(async (patch: Record<string, unknown>) => ({
    id: "draft-1",
    folio: "DT-2026-000045",
    pickup_point: "Origen",
    dropoff_point: "Destino",
    date: "2026-10-06",
    time: "10:30",
    passengers: 2,
    currency: "MXN",
    ...patch,
    status: patch.status ?? "draft",
  })),
  pdf: vi.fn(async (_input: unknown) => "http://localhost/qa.pdf"),
  reservation: undefined as unknown,
  customers: [] as unknown[],
}));
vi.mock("@/features/reservations/hooks", () => ({
  useCreateReservation: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateReservationFields: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
  useGenerateTicketPdf: () => ({ mutateAsync: mocks.pdf, isPending: false }),
  useReservation: () => ({ data: mocks.reservation, isPending: false }),
}));
vi.mock("@/features/reservations/locationHooks", () => ({
  useQuickReservationSupport: () => ({ data: true }),
}));
vi.mock("@/features/settings/hooks", () => ({
  useCompanySettings: () => ({
    data: {
      companyInfo: { name: "Danny Transfers", tagline: "QA aislado" },
      meetingPoints: {},
      ticketTerms: {},
    },
    isPending: false,
    isError: false,
  }),
}));
vi.mock("@/features/settings/catalogs", () => ({
  useCatalogs: () => ({
    data: [
      {
        id: SERVICE_ID,
        kind: "service_type",
        code: "aeropuerto_hotel",
        label: "Aeropuerto → Hotel",
        active: true,
        sort_order: 1,
      },
      {
        id: "pay-1",
        kind: "payment_method",
        code: "transfer",
        label: "Transferencia",
        active: true,
        sort_order: 1,
      },
    ],
    isPending: false,
  }),
  useServiceCatalogSupport: () => ({ data: true }),
}));
vi.mock("@/features/customers/hooks", () => ({
  useCustomerSearch: (term: string) => ({
    data: term.length >= 2 ? mocks.customers : [],
    isPending: false,
  }),
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ canEditReservations: false, user: { id: "employee-1" } }),
}));
import CreateTicketPage from "@/pages/CreateTicketPage";
import EditReservationPage from "@/pages/EditReservationPage";
import { reservationPayload } from "@/features/reservations/api";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

type CreateInput = { values: ReservationFormValues; intent: string };
const created = () => mocks.create.mock.calls[0][0] as CreateInput;

function mountCreate() {
  return render(
    <MemoryRouter initialEntries={["/ticket/nuevo"]}>
      <Routes>
        <Route path="/ticket/nuevo" element={<CreateTicketPage />} />
        <Route
          path="/reservaciones/:id/editar"
          element={<p>Editor del borrador</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}
const summary = () =>
  within(screen.getByRole("complementary", { name: "Resumen de reservación" }));

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombre completo/), "QA local");
  await user.type(screen.getByLabelText(/^Teléfono/), "9991234567");
  await user.type(screen.getByLabelText(/^Punto de recogida/), "Delek Tulum");
  await user.type(screen.getByLabelText(/^Destino/), "Tulum Airport (TQO)");
  await user.type(screen.getByLabelText(/^Fecha de ida/), "2026-10-08");
  await user.type(screen.getByLabelText(/^Hora de ida/), "14:30");
}

beforeEach(() => {
  sessionStorage.clear();
  mocks.customers = [];
  mocks.reservation = undefined;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Nueva reservación en una sola página", () => {
  it("solo ida: sin pasos intermedios, un solo envío final y un PDF", async () => {
    const user = userEvent.setup();
    mountCreate();
    expect(screen.queryByRole("button", { name: /Siguiente/ })).toBeNull();
    await fillBasics(user);
    await user.type(screen.getByLabelText(/^Precio total/), "1850");
    expect(summary().getByText("QA local")).toBeTruthy();
    expect(summary().getByText("Delek Tulum")).toBeTruthy();
    expect(summary().getByText("Sin información")).toBeTruthy();
    expect(summary().getByText("Sin hotel")).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledTimes(1));
    const { values, intent } = created();
    expect(intent).toBe("final");
    const payload = reservationPayload(values);
    expect(payload.customer_phone).toBe("+52 9991234567");
    expect(payload.return_date).toBeNull();
    expect(payload.airline).toBeNull();
    expect(payload.hotel).toBeNull();
    expect(payload.deposit).toBe(0);
    expect(payload).not.toHaveProperty("vehicle_id");
    expect(payload).not.toHaveProperty("driver_id");
    expect(await screen.findByText("Ticket creado")).toBeTruthy();
  });

  it("exige precio para generar el ticket sin enviar nada", async () => {
    const user = userEvent.setup();
    mountCreate();
    await fillBasics(user);
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    expect(await screen.findByText("Precio requerido")).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("ida y regreso invierte la ruta y exige hora o Por determinar", async () => {
    const user = userEvent.setup();
    mountCreate();
    await fillBasics(user);
    await user.type(screen.getByLabelText(/^Precio total/), "1850");
    await user.click(screen.getByLabelText("Ida y regreso"));
    expect(
      screen.getByLabelText(/^Punto de recogida \(regreso\)/),
    ).toHaveProperty("value", "Tulum Airport (TQO)");
    expect(screen.getByLabelText(/^Destino \(regreso\)/)).toHaveProperty(
      "value",
      "Delek Tulum",
    );
    await user.type(screen.getByLabelText(/^Fecha de regreso/), "2026-10-10");
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    expect(
      await screen.findByText("Selecciona una hora o activa Por determinar"),
    ).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText(/^Hora de regreso/), "18:30");
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = reservationPayload(created().values);
    expect(payload.return_time).toBe("18:30");
    expect(payload.return_pickup_point).toBe("Tulum Airport (TQO)");
  });

  it("Por determinar desactiva la hora, guarda NULL y lo muestra en el resumen", async () => {
    const user = userEvent.setup();
    mountCreate();
    await fillBasics(user);
    await user.type(screen.getByLabelText(/^Precio total/), "1850");
    await user.click(screen.getByLabelText("Ida y regreso"));
    await user.type(screen.getByLabelText(/^Fecha de regreso/), "2026-10-10");
    await user.type(screen.getByLabelText(/^Hora de regreso/), "18:30");
    await user.click(screen.getByLabelText("Por determinar"));
    const time = screen.getByLabelText(/^Hora de regreso/) as HTMLInputElement;
    expect(time.disabled).toBe(true);
    expect(time.value).toBe("");
    expect(summary().getByText("Por determinar")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = reservationPayload(created().values);
    expect(payload.return_time).toBeNull();
    expect(payload.return_date).toBe("2026-10-10");
  });

  it("vuelo con logo de aerolínea, hotel y estados de pago automáticos", async () => {
    const user = userEvent.setup();
    mountCreate();
    await fillBasics(user);
    await user.click(
      screen.getByRole("button", { name: /Aeropuerto → Hotel/ }),
    );
    await user.click(
      screen.getByRole("switch", { name: "Incluir información de vuelo" }),
    );
    expect(screen.getByLabelText(/^Fecha del vuelo/)).toHaveProperty(
      "value",
      "2026-10-08",
    );
    await user.type(screen.getByLabelText(/^Aerolínea$/), "volaris");
    await user.type(screen.getByLabelText(/^Número de vuelo/), "Y4 123");
    const logo = summary().getByRole("img", { name: "Volaris" });
    expect(logo.getAttribute("src")).toContain(
      "/assets/rickytickets/airlines/volaris.svg",
    );
    await user.type(
      screen.getByLabelText(/^Nombre del hotel/),
      "Hyatt Regency Tulum",
    );
    await user.type(screen.getByLabelText(/^Habitación/), "208");
    await user.type(screen.getByLabelText(/^Precio total/), "1850");
    expect(summary().getByText("Pendiente")).toBeTruthy();
    await user.type(screen.getByLabelText(/^Anticipo/), "500");
    expect(screen.getByText("$1,350.00")).toBeTruthy();
    expect(summary().getAllByText("Anticipo")).toHaveLength(2);
    await user.clear(screen.getByLabelText(/^Anticipo/));
    await user.type(screen.getByLabelText(/^Anticipo/), "1850");
    expect(summary().getByText("Pagado")).toBeTruthy();
    expect(summary().getByText("Habitación 208")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    const payload = reservationPayload(created().values);
    expect(payload).toMatchObject({
      airline: "volaris",
      flight_number: "Y4 123",
      flight_date: "2026-10-08",
      hotel: "Hyatt Regency Tulum",
      room: "208",
      price: 1850,
      deposit: 1850,
      service_catalog_item_id: SERVICE_ID,
    });
  });

  it("desactivar el vuelo descarta los datos escritos", async () => {
    const user = userEvent.setup();
    mountCreate();
    await fillBasics(user);
    await user.type(screen.getByLabelText(/^Precio total/), "100");
    const toggle = screen.getByRole("switch", {
      name: "Incluir información de vuelo",
    });
    await user.click(toggle);
    await user.type(screen.getByLabelText(/^Aerolínea$/), "Delta");
    await user.click(toggle);
    expect(summary().getByText("Sin información")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(reservationPayload(created().values).airline).toBeNull();
  });

  it("guarda un borrador sin precio ni PDF y abre su edición", async () => {
    const user = userEvent.setup();
    mountCreate();
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    expect(await screen.findByText("Escribe el nombre completo")).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    await fillBasics(user);
    await user.click(screen.getByLabelText("Ida y regreso"));
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(created().intent).toBe("draft");
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(await screen.findByText("Editor del borrador")).toBeTruthy();
  });

  it("selecciona un cliente existente y conserva su prefijo telefónico", async () => {
    mocks.customers = [
      {
        id: "c1",
        full_name: "Mia Hamilton",
        phone: "+1 305 555 0100",
        email: "mia@example.com",
      },
    ];
    const user = userEvent.setup();
    mountCreate();
    await user.type(
      screen.getByRole("combobox", { name: "Buscar cliente existente" }),
      "Mia",
    );
    await user.click(
      await screen.findByRole("option", { name: /Mia Hamilton/ }),
    );
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveProperty(
      "value",
      "Mia Hamilton",
    );
    expect(screen.getByLabelText("País del teléfono")).toHaveProperty(
      "value",
      "US",
    );
    expect(summary().getByText("+1 305 555 0100")).toBeTruthy();
    expect(screen.getByText(/Cliente existente/)).toBeTruthy();
  });

  it("recupera lo escrito sin guardar durante la sesión", async () => {
    const user = userEvent.setup();
    const first = mountCreate();
    await user.type(screen.getByLabelText(/^Nombre completo/), "Sesión QA");
    first.unmount();
    mountCreate();
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveProperty(
      "value",
      "Sesión QA",
    );
    expect(
      screen.getByText(/Se recuperó la reservación sin guardar/),
    ).toBeTruthy();
  });
});

const draftRow = {
  id: "draft-1",
  folio: "DT-2026-000045",
  customer_id: "c1",
  customer: {
    id: "c1",
    full_name: "Cliente borrador",
    phone: "+52 999 000 1111",
    email: null,
  },
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
  flight_time: null,
  return_date: "2026-10-07",
  return_time: null,
  return_pickup_point: "Destino",
  return_dropoff_point: "Origen",
  return_airline: null,
  return_flight_number: null,
  passengers: 2,
  price: null,
  deposit: 0,
  currency: "MXN",
  payment_method: null,
  notes: null,
  status: "draft",
  created_by: "employee-1",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  deleted_at: null,
  // Columnas históricas que la interfaz ya no usa.
  vehicle_id: "00000000-0000-4000-8000-00000000000v",
  driver_id: "00000000-0000-4000-8000-00000000000d",
} as unknown as ReservationWithRelations;

describe("Editar y completar una reservación", () => {
  function mountEdit() {
    return render(
      <MemoryRouter initialEntries={["/reservaciones/draft-1/editar"]}>
        <Routes>
          <Route
            path="/reservaciones/:id/editar"
            element={<EditReservationPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("su autor continúa un borrador antiguo y al completarlo pasa a pendiente con PDF", async () => {
    mocks.reservation = draftRow;
    const user = userEvent.setup();
    mountEdit();
    expect(
      screen.getByRole("heading", { name: "Continuar borrador" }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/^Nombre completo/)).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Por determinar")).toHaveProperty(
      "checked",
      true,
    );
    await user.type(screen.getByLabelText(/^Precio total/), "900");
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const patch = mocks.update.mock.calls[0][0];
    expect(patch).toMatchObject({
      status: "pending",
      price: 900,
      return_time: null,
    });
    expect(patch).not.toHaveProperty("customer_phone");
    expect(patch).not.toHaveProperty("vehicle_id");
    expect(patch).not.toHaveProperty("driver_id");
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledTimes(1));
  });

  it("guardar el borrador lo actualiza sin generar PDF", async () => {
    mocks.reservation = draftRow;
    const user = userEvent.setup();
    mountEdit();
    await user.type(
      screen.getByLabelText(/^Notas adicionales/),
      "Silla de bebé",
    );
    await user.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("status");
    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      notes: "Silla de bebé",
    });
    expect(mocks.pdf).not.toHaveBeenCalled();
    expect(await screen.findByText("Borrador actualizado.")).toBeTruthy();
  });

  it("sin permiso general, una reservación confirmada queda en solo lectura", () => {
    mocks.reservation = { ...draftRow, status: "confirmed", price: 900 };
    mountEdit();
    expect(screen.getByText(/Solo lectura/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    ).toHaveProperty("disabled", true);
  });
});
