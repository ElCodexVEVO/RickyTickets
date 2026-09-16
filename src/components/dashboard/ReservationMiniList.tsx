import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import type { ReservationWithRelations } from "@/types/database.types";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTime } from "@/lib/format";

export function ReservationMiniList({
  reservations,
  emptyLabel,
}: {
  reservations: ReservationWithRelations[];
  emptyLabel: string;
}) {
  if (reservations.length === 0) {
    return <EmptyState icon={CalendarClock} title={emptyLabel} />;
  }

  return (
    <ul className="divide-y divide-cream-200">
      {reservations.map((r) => (
        <li key={r.id}>
          <Link
            to={`/reservaciones/${r.id}`}
            className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-cream-50 -mx-2 px-2 rounded-lg"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">{r.customer?.full_name ?? "Cliente"}</p>
              <p className="truncate text-xs text-ink-500">
                {r.pickup_point} → {r.dropoff_point}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-mono-tab text-xs text-ink-500">
                {formatDate(r.date, "d MMM")} · {formatTime(r.time)}
              </span>
              <StatusBadge status={r.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
