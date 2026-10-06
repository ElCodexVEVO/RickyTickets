// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  create: vi.fn(async () => ({
    id: "local-test",
    folio: "QA-LOCAL",
    status: "pending",
  })),
  pdf: vi.fn(async () => ({ signedUrl: "http://localhost/qa.pdf" })),
}));
vi.mock("@/features/reservations/hooks", () => ({
  useCreateReservation: () => ({ mutateAsync: mocks.create, isPending: false }),
  useReservations: () => ({ data: [], isPending: false }),
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
  useCatalogs: () => ({ data: [], isPending: false }),
  useServiceCatalogSupport: () => ({ data: false }),
}));
vi.mock("@/features/vehicles/hooks", () => ({
  useVehicles: () => ({ data: [], isPending: false }),
}));
vi.mock("@/features/drivers/hooks", () => ({
  useDrivers: () => ({ data: [], isPending: false }),
}));
vi.mock("@/features/customers/hooks", () => ({
  useCustomerSearch: () => ({ data: [] }),
}));
vi.mock("@/pdf/generateTicketPdf", () => ({
  generateAndStoreTicketPdf: mocks.pdf,
}));
import CreateTicketPage from "@/pages/CreateTicketPage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Guardado explícito del formulario progresivo", () => {
  it("avanzar a Confirmar no crea nada; únicamente Guardar envía el payload", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CreateTicketPage embedded />
      </MemoryRouter>,
    );
    await user.type(
      screen.getByLabelText("Nombre completo", { exact: false }),
      "QA local",
    );
    await user.type(
      screen.getByLabelText("Teléfono", { exact: false }),
      "9991234567",
    );
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await user.type(
      screen.getByLabelText("Punto de recogida", { exact: false }),
      "Origen",
    );
    await user.type(
      screen.getByLabelText("Destino", { exact: false }),
      "Destino",
    );
    await user.type(
      screen.getByLabelText("Fecha de ida", { exact: false }),
      "2026-10-06",
    );
    await user.type(
      screen.getByLabelText("Hora de ida", { exact: false }),
      "10:30",
    );
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await user.type(screen.getByLabelText("Precio total"), "180.50");
    await user.click(screen.getByRole("button", { name: "Siguiente →" }));
    await screen.findByRole("button", { name: "Guardar y generar PDF" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Guardar y generar PDF" }),
    );
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledTimes(1));
  });
});
