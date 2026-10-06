import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUpdateReservationStatus } from "@/features/reservations/hooks";
import { returnTimeLabel } from "@/lib/operations";
import { QueryState } from "@/components/ui/QueryState";
import type {
  ReservationStatus,
  ReservationWithRelations,
} from "@/types/database.types";
const columns: {
  key: ReservationStatus;
  label: string;
  tone: string;
  heading: string;
}[] = [
  {
    key: "pending",
    label: "Por confirmar",
    tone: "border-gold-500/30",
    heading: "text-gold-400",
  },
  {
    key: "confirmed",
    label: "Confirmados",
    tone: "border-sky-400/30",
    heading: "text-sky-300",
  },
  {
    key: "in_service",
    label: "En servicio",
    tone: "border-positive-500/30",
    heading: "text-positive-700",
  },
  {
    key: "completed",
    label: "Completados",
    tone: "border-line",
    heading: "text-ink-700",
  },
];
export function DispatchBoard({
  reservations,
  compact = false,
}: {
  reservations: ReservationWithRelations[];
  compact?: boolean;
}) {
  const { canEditReservations } = useAuth();
  const change = useUpdateReservationStatus();
  return (
    <div>
      <QueryState error={change.error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map((c) => {
          const rows = reservations.filter((r) => r.status === c.key);
          return (
            <section
              key={c.key}
              className={`min-w-0 rounded-lg border bg-carbon-900 ${compact ? "p-2" : "p-3"} ${c.tone}`}
            >
              <h3 className={`mb-2 text-xs font-semibold ${c.heading}`}>
                {c.label} <span className="text-ink-500">({rows.length})</span>
              </h3>
              <div
                className={`${compact ? "max-h-[96px]" : "max-h-[280px]"} space-y-2 overflow-y-auto pr-1`}
              >
                {rows.map((r) => (
                  <article
                    key={r.id}
                    className={`rounded-md border border-line border-l-2 bg-surface-900 ${compact ? "p-2 text-[11px]" : "p-3 text-xs"} ${c.tone}`}
                  >
                    <Link
                      to={`/reservaciones/${r.id}`}
                      className="font-mono-tab font-medium text-gold-300"
                    >
                      {r.folio}
                    </Link>
                    <p
                      className="mt-1 truncate"
                      title={`${r.pickup_point} → ${r.dropoff_point}`}
                    >
                      {r.pickup_point} → {r.dropoff_point}
                    </p>
                    <p className="mt-1 text-ink-500">
                      {r.time.slice(0, 5)} · {r.passengers} pax
                    </p>
                    {r.service_type === "redondo" && (
                      <p className="mt-1 text-pending-500">
                        Regreso · {returnTimeLabel(r.return_time)}
                      </p>
                    )}
                    {canEditReservations && (
                      <select
                        aria-label={`Estado de ${r.folio}`}
                        value={r.status}
                        disabled={change.isPending}
                        onChange={(e) =>
                          change.mutate({
                            id: r.id,
                            status: e.target.value as ReservationStatus,
                          })
                        }
                        className="mt-2 w-full rounded-md border border-line bg-carbon-800 p-1.5 text-xs"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="in_service">En servicio</option>
                        <option value="completed">Completado</option>
                      </select>
                    )}
                  </article>
                ))}
                {!rows.length && (
                  <p
                    className={`${compact ? "py-6 text-[11px]" : "py-8 text-xs"} text-center text-ink-500`}
                  >
                    Sin servicios
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {!compact && (
        <p className="mt-2 text-[11px] text-ink-500">
          El estado pertenece a la reservación completa, incluidos sus trayectos
          de regreso. Los borradores y cancelaciones no aparecen aquí.
        </p>
      )}
    </div>
  );
}
