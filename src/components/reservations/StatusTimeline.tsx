import { CheckCircle2 } from "lucide-react";
import type { ReservationStatusHistoryRow } from "@/types/database.types";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { formatDate, formatTime } from "@/lib/format";

export function StatusTimeline({ history }: { history: ReservationStatusHistoryRow[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-ink-500">Sin historial todavía.</p>;
  }

  return (
    <ol className="space-y-4">
      {history.map((entry, i) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-100 text-gold-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            {i < history.length - 1 && <div className="mt-1 w-px flex-1 bg-cream-200" />}
          </div>
          <div className="pb-4">
            <StatusBadge status={entry.new_status} />
            <p className="mt-1 text-xs text-ink-500">
              {formatDate(entry.created_at, "d MMM yyyy")} · {formatTime(entry.created_at?.slice(11, 16))}
            </p>
            {entry.note && <p className="mt-1 text-xs text-ink-700">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
