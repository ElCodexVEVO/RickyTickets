import React from "react";
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TicketDocument } from "@/pdf/TicketDocument";
import type { TicketData } from "@/types/domain";

// Datos aislados: la prueba no importa el cliente Supabase ni sube archivos.
const fixture: TicketData = {
  folio: "QA-LOCAL-0001",
  status: "confirmed",
  customerName: "Cliente de prueba local",
  phone: "",
  pickupPoint: "Tulum Airport (TQO)",
  dropoffPoint: "Destino de prueba local",
  passengers: 4,
  date: "2026-10-06",
  time: "10:30",
  serviceType: "redondo",
  returnDate: "2026-10-07",
  returnPickupPoint: "Destino de prueba local",
  returnDropoffPoint: "Tulum Airport (TQO)",
  price: 180.5,
  currency: "USD",
};

const paid: Partial<TicketData> = {
  serviceLabel: "Aeropuerto → Hotel",
  airline: "Volaris",
  flightNumber: "Y4 123",
  flightDate: "2026-10-06",
  flightTime: "09:15",
  hotel: "Hotel de prueba",
  room: "208",
  price: 1850,
  deposit: 500,
  currency: "MXN",
  paymentMethod: "Transferencia",
  notes: "Silla para bebé.",
};

describe("PDF real de una reservación redonda", () => {
  it.each([
    ["pendiente", undefined, {}],
    ["confirmado", "16:30", {}],
    ["anticipo", undefined, paid],
    ["pagado", "16:30", { ...paid, deposit: 1850 }],
  ] as [string, string | undefined, Partial<TicketData>][])(
    "genera el ticket %s con el logo y un QR real",
    async (name, returnTime, extra) => {
      const logo = await readFile(path.resolve("src/assets/logo.png"));
      const qr = await QRCode.toDataURL(
        "http://localhost:5173/verificar/00000000-0000-4000-8000-000000000001",
        { errorCorrectionLevel: "M", margin: 1, width: 220 },
      );
      const buffer = await renderToBuffer(
        <TicketDocument
          data={{ ...fixture, ...extra, returnTime }}
          qrDataUrl={qr}
          logoSrc={`data:image/png;base64,${logo.toString("base64")}`}
          companyInfo={{
            name: "Danny Transfers",
            tagline: "Tulum Mexico",
            phone: "",
            instagram: "@dannytransfers",
            whatsapp: "",
          }}
          meetingPoints={{
            tulum_airport: "Punto de encuentro local",
            cancun_airport: "Punto de encuentro local",
          }}
          ticketTerms={{
            text: "Documento aislado para verificar el diseño y la hora de regreso.",
          }}
        />,
      );
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(10000);
      expect(buffer.toString("latin1")).toContain("/Subtype /Image");
      // Solo la sesión de QA conserva copias temporales para extracción y render.
      if (process.env.RICKY_PDF_QA === "1") {
        await mkdir("tmp/pdfs", { recursive: true });
        await writeFile(`tmp/pdfs/ticket-${name}.pdf`, buffer);
      }
    },
  );
});
