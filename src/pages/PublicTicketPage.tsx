import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { usePublicTicket } from "@/features/public/hooks";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { formatTicketDate, formatTime } from "@/lib/format";
import logoUrl from "@/assets/logo.png";
import { returnTimeLabel } from "@/lib/operations";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-2.5 text-sm">
      <span className="w-[42%] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
        {label}
      </span>
      <span className="flex-1 text-right text-cream-50">{value || "—"}</span>
    </div>
  );
}

export default function PublicTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError, refetch } = usePublicTicket(id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-carbon-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoUrl}
            alt="Danny Transfers"
            className="h-16 w-16 rounded-full object-cover"
          />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-100">
            Danny Transfers
          </p>
          <p className="font-script text-lg text-gold-400">
            Verificación de ticket
          </p>
        </div>

        {isLoading && (
          <p className="text-center text-sm text-ink-300">Buscando ticket…</p>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-2xl border border-line bg-carbon-900 p-8 text-center"
          >
            <p className="font-semibold text-pending-500">
              No se pudo verificar el ticket
            </p>
            <p className="mt-2 text-sm text-ink-300">
              Revisa la conexión e inténtalo de nuevo.
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-gold-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {!isError && !isLoading && !ticket && (
          <div className="rounded-2xl border border-white/10 bg-carbon-900 p-8 text-center">
            <XCircle className="mx-auto h-10 w-10 text-ink-300" />
            <p className="mt-3 font-display text-lg font-semibold text-cream-50">
              Ticket no encontrado
            </p>
            <p className="mt-1 text-sm text-ink-300">
              El código no corresponde a ningún ticket válido, o fue eliminado.
            </p>
          </div>
        )}

        {ticket && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-carbon-900 shadow-xl">
            <div className="flex items-center justify-between bg-carbon-950 px-5 py-4">
              <div
                className={`flex items-center gap-2 ${ticket.status === "cancelled" ? "text-danger-500" : "text-positive-500"}`}
              >
                {ticket.status === "cancelled" ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span className="text-sm font-semibold">
                  {ticket.status === "cancelled"
                    ? "Ticket cancelado"
                    : "Ticket registrado"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-[9px] tracking-[0.14em] text-ink-300">
                  FOLIO
                </p>
                <p className="font-mono-tab text-sm font-semibold text-cream-50">
                  {ticket.folio}
                </p>
              </div>
            </div>

            <div className="px-5 py-4">
              <Row label="Name" value={ticket.customer_name} />
              <Row label="Pick Up" value={ticket.pickup_point} />
              <Row label="Room" value={ticket.room} />
              <Row label="Drop Off" value={ticket.dropoff_point} />
              {ticket.hotel && <Row label="Hotel" value={ticket.hotel} />}
              <Row label="Number of People" value={String(ticket.passengers)} />
              <Row label="Date" value={formatTicketDate(ticket.date)} />
              <Row label="Hour" value={formatTime(ticket.time)} />

              {ticket.service_type === "redondo" && (
                <>
                  <p className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold-400">
                    Return Information
                  </p>
                  <Row
                    label="Return Date / Route"
                    value={[
                      formatTicketDate(ticket.return_date),
                      [ticket.return_pickup_point, ticket.return_dropoff_point]
                        .filter(Boolean)
                        .join(" → "),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  />
                  <Row
                    label="Hora de regreso"
                    value={returnTimeLabel(ticket.return_time)}
                  />
                </>
              )}

              <div className="mt-5 flex justify-center">
                <StatusBadge status={ticket.status} lang="en" />
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink-500">
          Danny Transfers · Tulum, México
        </p>
      </div>
    </div>
  );
}
