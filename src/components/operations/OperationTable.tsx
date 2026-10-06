import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import type { ServiceLeg } from "@/lib/operations";
export function OperationTable({
  legs,
  compact = false,
}: {
  legs: ServiceLeg[];
  compact?: boolean;
}) {
  return (
    <Card
      className={
        compact
          ? "overflow-hidden rounded-none border-0 shadow-none"
          : "overflow-hidden"
      }
    >
      <div className="overflow-x-auto">
        <table
          className={`w-full text-[13px] ${compact ? "min-w-[620px]" : "min-w-[700px]"}`}
        >
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-500">
              {[
                "Hora",
                "Folio",
                "Ruta",
                "Cliente",
                "Pasajeros",
                "Vuelo",
                "Estado",
              ].map((h) => (
                <th className="px-2 py-2" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {legs.map((l) => (
              <tr
                key={l.key}
                className="border-b border-line last:border-0 hover:bg-carbon-800/40"
              >
                <td className="px-2 py-2 font-mono-tab">
                  {l.time ? (
                    l.time.slice(0, 5)
                  ) : (
                    <Badge tone="warning">Por determinar</Badge>
                  )}
                </td>
                <td className="px-2 py-2">
                  <Link
                    className="text-gold-300"
                    to={`/reservaciones/${l.reservation.id}`}
                  >
                    {l.reservation.folio}
                  </Link>
                  {!compact && (
                    <p className="mt-1 text-[11px] text-ink-500">
                      {l.direction}
                    </p>
                  )}
                </td>
                <td className="max-w-52 px-2 py-2">
                  <p>
                    {l.pickup} → {l.dropoff}
                  </p>
                </td>
                <td className="max-w-40 truncate px-2 py-2 text-ink-700">
                  {l.reservation.customer?.full_name ?? "—"}
                </td>
                <td className="px-2 py-2">{l.reservation.passengers} pax</td>
                <td className="px-2 py-2 text-ink-500">
                  {l.flight ?? "Sin vuelo"}
                </td>
                <td className="px-2 py-2">
                  <StatusBadge status={l.reservation.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!legs.length && (
          <p className="p-8 text-center text-sm text-ink-500">
            Sin servicios para este día.
          </p>
        )}
      </div>
    </Card>
  );
}
