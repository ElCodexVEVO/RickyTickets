import { QrCode } from "lucide-react";
import type { TicketData } from "@/types/domain";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { formatCurrency, formatTicketDate, formatTime } from "@/lib/format";
import { useCompanySettings } from "@/features/settings/hooks";
import logoUrl from "@/assets/logo.png";

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cream-200 py-2.5 text-sm">
      <span className="w-[38%] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      <span className="flex-1 text-right text-ink-900">{value || "—"}</span>
    </div>
  );
}

export function TicketPreview({ data }: { data: TicketData }) {
  const { data: settings } = useCompanySettings();
  const companyInfo = settings?.companyInfo;
  const meetingPoints = settings?.meetingPoints;

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white card-shadow">
      <div className="flex items-center justify-between bg-carbon-950 px-5 py-5">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Danny Transfers" className="h-11 w-11 shrink-0 rounded-full object-cover" />
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-cream-100">
              {(companyInfo?.name ?? "Danny Transfers").toUpperCase()}
            </p>
            <p className="font-script text-xl font-semibold text-gold-400">
              {companyInfo?.tagline ?? "Tulum Mexico"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] tracking-[0.14em] text-ink-300">FOLIO</p>
          <p className="font-mono-tab text-sm font-semibold text-cream-50">{data.folio}</p>
        </div>
      </div>

      <div className="px-5 py-4">
        <Row label="Name" value={data.customerName} />
        <Row label="Pick Up" value={data.pickupPoint} />
        <Row label="Room" value={data.room} />
        <Row label="Drop Off" value={data.dropoffPoint} />
        {data.hotel && <Row label="Hotel" value={data.hotel} />}
        <Row label="Number of People" value={String(data.passengers)} />
        <Row label="Date" value={formatTicketDate(data.date)} />
        <Row label="Hour" value={formatTime(data.time)} />
        <Row label="Phone Number, Email" value={[data.phone, data.email].filter(Boolean).join(" · ")} />
        <Row label="Airline/Flight Number" value={[data.airline, data.flightNumber].filter(Boolean).join(" · ")} />

        {data.serviceType === "redondo" && (
          <>
            <p className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-600">
              Return Information
            </p>
            <Row
              label="Date and Time of Return"
              value={[
                formatTicketDate(data.returnDate),
                [data.returnPickupPoint, data.returnDropoffPoint].filter(Boolean).join(" → "),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row label="Return Time" value={formatTime(data.returnTime)} />
            {(data.returnAirline || data.returnFlightNumber) && (
              <Row
                label="Return Airline/Flight"
                value={[data.returnAirline, data.returnFlightNumber].filter(Boolean).join(" · ")}
              />
            )}
          </>
        )}

        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Price</p>
            <p className="font-display text-2xl font-semibold text-ink-900">
              {data.price != null ? formatCurrency(data.price, data.currency) : "To be confirmed"}
            </p>
            <div className="mt-2">
              <StatusBadge status={data.status} lang="en" />
            </div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-cream-200 bg-cream-50 text-ink-300">
            <QrCode className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="border-t border-cream-200 bg-cream-50 px-5 py-4 text-[10px] leading-relaxed text-ink-500">
        <p className="font-semibold text-ink-700">Meeting Point Tulum Airport</p>
        <p className="mb-2">{meetingPoints?.tulum_airport}</p>
        <p className="font-semibold text-ink-700">Meeting Point Cancún Airport</p>
        <p>{meetingPoints?.cancun_airport}</p>
      </div>
    </div>
  );
}
