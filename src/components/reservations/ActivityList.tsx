import { useActivity } from "@/features/activity/hooks";
import { QueryState } from "@/components/ui/QueryState";
import { returnTimeLabel } from "@/lib/operations";
import { formatDate } from "@/lib/format";
import { statusLabels } from "@/components/reservations/StatusBadge";
import type { ReservationStatus } from "@/types/database.types";
const actions: Record<string, string> = {
  create_reservation: "creó la reservación",
  cancel_reservation: "canceló la reservación",
  delete_reservation: "ocultó la reservación",
  update_reservation: "actualizó la reservación",
};
// driver_id/vehicle_id solo aparecen en eventos históricos anteriores a 0008.
const fieldLabels: Record<string, string> = {
  return_time: "Hora de regreso",
  return_date: "Fecha de regreso",
  driver_id: "Conductor (histórico)",
  vehicle_id: "Vehículo (histórico)",
  status: "Estado",
  date: "Fecha",
  time: "Hora",
  price: "Precio",
  deposit: "Anticipo",
  passengers: "Pasajeros",
  pickup_point: "Recogida",
  dropoff_point: "Destino",
  return_pickup_point: "Recogida de regreso",
  return_dropoff_point: "Destino de regreso",
  payment_method: "Método de pago",
  currency: "Moneda",
  flight_number: "Vuelo",
  flight_time: "Hora del vuelo",
};
export function ActivityList({ entityId }: { entityId?: string }) {
  const query = useActivity(entityId);
  return (
    <div>
      <QueryState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      <ol className="divide-y divide-line">
        {query.data?.map((e) => {
          const changes = e.metadata?.changes;
          return (
            <li key={e.id} className="py-3 text-xs">
              <p>
                <span className="font-medium text-gold-300">
                  {e.actor?.full_name ?? "Usuario registrado"}
                </span>{" "}
                {actions[e.action] ?? e.action}{" "}
                <span className="font-mono-tab">
                  {typeof e.metadata?.folio === "string"
                    ? e.metadata.folio
                    : ""}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-ink-500">
                {formatDate(e.created_at, "d MMM yyyy HH:mm")}
              </p>
              {typeof e.metadata?.note === "string" && (
                <p className="mt-1 text-ink-500">{e.metadata.note}</p>
              )}
              {!!changes &&
                typeof changes === "object" &&
                Object.entries(changes).map(([field, value]) => {
                  if (
                    !value ||
                    typeof value !== "object" ||
                    !("after" in value)
                  )
                    return null;
                  const change = value as { before?: unknown; after: unknown };
                  const display = (v: unknown) =>
                    field === "return_time"
                      ? returnTimeLabel(typeof v === "string" ? v : null)
                      : field === "status"
                        ? (statusLabels[String(v) as ReservationStatus] ??
                          String(v))
                        : v == null
                          ? "Sin asignar"
                          : String(v);
                  return (
                    <p key={field} className="mt-1 text-ink-500">
                      {fieldLabels[field] ?? field}: {display(change.before)} →{" "}
                      {display(change.after)}
                    </p>
                  );
                })}
            </li>
          );
        })}
      </ol>
      {query.data?.length === 0 && (
        <p className="py-4 text-sm text-ink-500">Sin actividad registrada.</p>
      )}
      <p className="mt-3 text-[10px] text-ink-500">
        Últimos 200 eventos guardados. Solo se muestran acciones registradas.
      </p>
    </div>
  );
}
