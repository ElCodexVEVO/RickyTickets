import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUpdateReservationStatus } from "@/features/reservations/hooks";
import { returnTimeLabel } from "@/lib/operations";
import { QueryState } from "@/components/ui/QueryState";
import type {
  ReservationStatus,
  ReservationWithRelations,
} from "@/types/database.types";
const columns = [
  { key: "unassigned", label: "Sin asignar", tone: "border-danger-500/30" },
  { key: "preparing", label: "Preparando", tone: "border-gold-500/30" },
  { key: "service", label: "En servicio", tone: "border-positive-500/30" },
  { key: "completed", label: "Completados", tone: "border-line" },
];
function column(r: ReservationWithRelations) {
  return r.status === "completed"
    ? "completed"
    : r.status === "in_service"
      ? "service"
      : !r.driver_id || !r.vehicle_id
        ? "unassigned"
        : "preparing";
}
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
          const rows = reservations.filter(
            (r) => r.status !== "cancelled" && column(r) === c.key,
          );
          return (
            <section
              key={c.key}
              className={`min-w-0 rounded-lg border bg-carbon-900 ${compact ? "p-2" : "p-3"} ${c.tone}`}
            >
              <h3
                className={`mb-2 text-xs font-semibold ${c.key === "unassigned" ? "text-danger-500" : c.key === "preparing" ? "text-gold-400" : c.key === "service" ? "text-positive-700" : "text-ink-700"}`}
              >
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
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-ink-500">
                        Asignación y estado
                      </summary>
                      <p className="mt-2 text-ink-500">
                        {r.driver?.full_name ?? "Conductor por asignar"}
                      </p>
                      <p className="text-ink-500">
                        {r.vehicle
                          ? `${r.vehicle.model} · ${r.vehicle.plate}`
                          : "Vehículo por asignar"}
                      </p>
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
                          className="mt-3 w-full rounded-md border border-line bg-carbon-800 p-1.5 text-xs"
                        >
                          <option value="pending">Pendiente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="in_service">En servicio</option>
                          <option value="completed">Completado</option>
                        </select>
                      )}
                    </details>
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
          El estado y las asignaciones pertenecen a la reservación completa,
          incluidos sus trayectos de regreso.
        </p>
      )}
    </div>
  );
}
