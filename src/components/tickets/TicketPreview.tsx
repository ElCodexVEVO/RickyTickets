import { QrCode } from "lucide-react";
import type { TicketData } from "@/types/domain";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { formatCurrency, formatTicketDate, formatTime } from "@/lib/format";
import { useCompanySettings } from "@/features/settings/hooks";
import logoUrl from "@/assets/logo.png";
import sceneryUrl from "@/assets/tulum-coast-v2.png";
import { returnTimeLabel } from "@/lib/operations";
function Row({
  label,
  value,
  pending = false,
}: {
  label: string;
  value?: string;
  pending?: boolean;
}) {
  return (
    <div className="paper-rule border-b py-1.5">
      <p className="paper-muted text-[9px]">{label}</p>
      <p
        className={`paper-value mt-0.5 text-[11px] font-medium leading-snug ${pending ? "inline-block rounded border border-amber-500 bg-amber-100 px-2 py-1" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}
export function TicketPreview({ data }: { data: TicketData }) {
  const { data: settings } = useCompanySettings();
  const companyInfo = settings?.companyInfo;
  const draft = data.folio === "Assigned when saved";
  return (
    <div className="ticket-paper relative">
      <div
        className="absolute inset-y-0 left-0 w-14 bg-cover"
        style={{
          backgroundImage: `url(${sceneryUrl})`,
          backgroundPosition: "70% center",
        }}
        aria-hidden="true"
      />
      <div className="relative pl-[68px] pr-3">
        <div className="paper-rule flex items-center justify-between gap-2 border-b py-3">
          <div className="text-center">
            <img
              src={logoUrl}
              alt="Danny Transfers"
              className="mx-auto h-12 w-12 rounded-full object-contain"
            />
            <p className="mt-1 text-[8px] font-semibold tracking-wide">
              {(companyInfo?.name ?? "Danny Transfers").toUpperCase()}
            </p>
            <p className="paper-muted text-[8px]">
              {companyInfo?.tagline ?? "Tulum, México"}
            </p>
          </div>
          <div className="text-center">
            <QrCode size={31} className="mx-auto text-[#565346]" />
            <p className="paper-muted mt-1 text-[7px]">QR al generar</p>
          </div>
        </div>
        <div className="py-3">
          <p className="text-sm font-bold">
            {draft ? "Folio al guardar" : data.folio}
          </p>
          <div className="mt-1">
            <StatusBadge status={data.status} />
          </div>
        </div>
        <Row
          label="Cliente"
          value={data.customerName === "Customer Name" ? "" : data.customerName}
        />
        <Row
          label="Ruta"
          value={[data.pickupPoint, data.dropoffPoint]
            .filter(Boolean)
            .join(" → ")}
        />
        {data.hotel && <Row label="Hotel" value={data.hotel} />}
        {data.room && <Row label="Habitación" value={data.room} />}
        <div className="grid grid-cols-2 gap-3">
          <Row label="Fecha" value={formatTicketDate(data.date)} />
          <Row label="Hora de salida" value={formatTime(data.time)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row
            label="Pasajeros"
            value={`${data.passengers} ${data.passengers === 1 ? "persona" : "personas"}`}
          />
          <Row
            label="Vuelo"
            value={[data.airline, data.flightNumber].filter(Boolean).join(" ")}
          />
        </div>
        <Row
          label="Contacto"
          value={[data.phone, data.email].filter(Boolean).join(" · ")}
        />
        <Row label="Vehículo" value={data.vehicleName ?? "Por asignar"} />
        <Row label="Conductor" value={data.driverName ?? "Por asignar"} />
        {data.serviceType === "redondo" && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-[#967121]">
              INFORMACIÓN DE REGRESO
            </p>
            <Row
              label="Fecha / Ruta"
              value={[
                formatTicketDate(data.returnDate),
                [data.returnPickupPoint, data.returnDropoffPoint]
                  .filter(Boolean)
                  .join(" → "),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row
              label="Hora de regreso"
              value={returnTimeLabel(data.returnTime)}
              pending={!data.returnTime}
            />
            {(data.returnAirline || data.returnFlightNumber) && (
              <Row
                label="Vuelo de regreso"
                value={[data.returnAirline, data.returnFlightNumber]
                  .filter(Boolean)
                  .join(" ")}
              />
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 py-4">
          <span className="paper-muted text-[10px]">Total</span>
          <strong className="text-lg">
            {data.price != null
              ? `${formatCurrency(data.price, data.currency)} ${data.currency}`
              : "Por definir"}
          </strong>
        </div>
        <details className="paper-rule paper-muted border-t pb-3 pt-2 text-[9px] leading-relaxed">
          <summary className="cursor-pointer font-medium">
            Puntos de encuentro
          </summary>
          <p className="mt-2 font-semibold">Aeropuerto de Tulum</p>
          <p>{settings?.meetingPoints?.tulum_airport}</p>
          <p className="mt-2 font-semibold">Aeropuerto de Cancún</p>
          <p>{settings?.meetingPoints?.cancun_airport}</p>
        </details>
      </div>
    </div>
  );
}
