import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  UserRound,
  Car,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TicketData } from "@/types/domain";
import { formatCurrency, formatTicketDate, formatTime } from "@/lib/format";
import { returnTimeLabel } from "@/lib/operations";
function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 py-2 text-[10px]">
      <Icon size={13} className="mt-0.5 shrink-0 text-ink-500" />
      <span className="w-16 shrink-0 text-ink-500">{label}</span>
      <span className="min-w-0 flex-1 text-right text-cream-50">{value}</span>
    </div>
  );
}
export function ReservationSummary({ data }: { data: TicketData }) {
  return (
    <div className="my-5 rounded-lg border border-line bg-carbon-900 p-3">
      <h3 className="mb-3 text-xs font-semibold">Resumen de la reservación</h3>
      <div className="flex items-center justify-between rounded-md border border-gold-500/20 bg-gold-500/10 px-3 py-2">
        <div>
          <p className="text-[9px] text-gold-300">Folio al guardar</p>
          <p className="mt-1 text-sm font-semibold">Nueva reservación</p>
        </div>
        <span className="rounded-full bg-positive-50 px-2 py-1 text-[8px] text-positive-700">
          Borrador
        </span>
      </div>
      <div className="mt-2">
        <SummaryRow
          icon={MapPin}
          label="Ruta"
          value={
            [data.pickupPoint, data.dropoffPoint].filter(Boolean).join(" → ") ||
            "Por definir"
          }
        />
        <SummaryRow
          icon={CalendarDays}
          label="Fecha"
          value={data.date ? formatTicketDate(data.date) : "Por definir"}
        />
        <SummaryRow
          icon={Clock}
          label="Hora"
          value={data.time ? formatTime(data.time) : "Por definir"}
        />
        {data.serviceType === "redondo" && (
          <SummaryRow
            icon={Clock}
            label="Regreso"
            value={returnTimeLabel(data.returnTime)}
          />
        )}
        <SummaryRow
          icon={Users}
          label="Pasajeros"
          value={String(data.passengers)}
        />
        <SummaryRow
          icon={UserRound}
          label="Conductor"
          value={data.driverName || "Por asignar"}
        />
        <SummaryRow
          icon={Car}
          label="Vehículo"
          value={data.vehicleName || "Por asignar"}
        />
        <div className="mt-1 border-t border-line pt-1">
          <SummaryRow
            icon={Wallet}
            label="Total"
            value={
              data.price != null
                ? `${formatCurrency(data.price, data.currency)} ${data.currency}`
                : "Por definir"
            }
          />
        </div>
      </div>
    </div>
  );
}
