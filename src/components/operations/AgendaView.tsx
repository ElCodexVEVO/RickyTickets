import { useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { operationDate, serviceLegs, type ServiceLeg } from "@/lib/operations";
import { formatDate } from "@/lib/format";
import type { ReservationWithRelations } from "@/types/database.types";
function ServiceBlock({ leg }: { leg: ServiceLeg }) {
  return (
    <Link
      to={`/reservaciones/${leg.reservation.id}`}
      className={`block min-w-0 rounded-lg border-l-2 bg-carbon-800 p-2.5 text-xs transition-colors hover:bg-carbon-700 ${!leg.time ? "border-pending-500" : leg.reservation.status === "completed" ? "border-positive-500" : "border-gold-500"}`}
    >
      <p className="font-medium">
        {leg.direction} · {leg.time ? leg.time.slice(0, 5) : "Por determinar"}
      </p>
      <p className="mt-1 font-mono-tab text-[10px] text-gold-300">
        {leg.reservation.folio}
      </p>
      <p className="mt-1">
        {leg.pickup} → {leg.dropoff}
      </p>
      <p className="my-1 text-[10px] text-ink-500">
        {leg.reservation.passengers} pasajeros
      </p>
      <StatusBadge status={leg.reservation.status} />
    </Link>
  );
}
export function AgendaView({
  reservations,
}: {
  reservations: ReservationWithRelations[];
}) {
  const [mode, setMode] = useState<"day" | "week" | "month">("day");
  const [date, setDate] = useState(operationDate());
  const anchor = parseISO(date);
  const start =
    mode === "month"
      ? startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
      : mode === "week"
        ? startOfWeek(anchor, { weekStartsOn: 1 })
        : anchor;
  const end =
    mode === "month"
      ? endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
      : mode === "week"
        ? endOfWeek(anchor, { weekStartsOn: 1 })
        : anchor;
  const days = eachDayOfInterval({ start, end });
  const legs = serviceLegs(reservations);
  const navigate = (direction: number) =>
    setDate(
      format(
        mode === "month"
          ? addMonths(anchor, direction)
          : addDays(anchor, direction * (mode === "week" ? 7 : 1)),
        "yyyy-MM-dd",
      ),
    );
  const current = legs.filter((l) => l.date === date);
  const pending = current.filter((l) => !l.time);
  const timed = current.filter((l) => l.time);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            aria-label="Periodo anterior"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Input
            aria-label="Fecha de agenda"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="w-40"
          />
          <Button
            size="sm"
            variant="secondary"
            aria-label="Periodo siguiente"
            onClick={() => navigate(1)}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDate(operationDate())}
          >
            Hoy
          </Button>
        </div>
        <div className="flex rounded-lg border border-line bg-carbon-900 p-1">
          {(["day", "week", "month"] as const).map((m, i) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1.5 text-xs ${mode === m ? "bg-gold-500/20 text-gold-300" : "text-ink-500"}`}
            >
              {["Día", "Semana", "Mes"][i]}
            </button>
          ))}
        </div>
      </div>
      {mode === "day" ? (
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold">
            {formatDate(date, "EEEE d MMMM yyyy")}
          </h2>
          {pending.length > 0 && (
            <div className="mb-5 rounded-xl border border-dashed border-gold-500/40 p-3">
              <h3 className="mb-3 text-xs text-pending-500">
                Regresos por determinar · sin horario asignado
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {pending.map((l) => (
                  <ServiceBlock key={l.key} leg={l} />
                ))}
              </div>
            </div>
          )}
          {Array.from(new Set(timed.map((l) => l.time!.slice(0, 2))))
            .sort()
            .map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[55px_minmax(0,1fr)] gap-3 border-t border-line py-3"
              >
                <p className="pt-2 font-mono-tab text-xs text-ink-500">
                  {hour}:00
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {timed
                    .filter((l) => l.time!.slice(0, 2) === hour)
                    .map((l) => (
                      <ServiceBlock key={l.key} leg={l} />
                    ))}
                </div>
              </div>
            ))}
          {!current.length && (
            <p className="py-12 text-center text-sm text-ink-500">
              Sin servicios para esta fecha.
            </p>
          )}
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const items = legs.filter((l) => l.date === key);
              return (
                <Card
                  key={key}
                  className={`min-h-36 p-2 ${key === operationDate() ? "border-gold-500/60" : ""}`}
                >
                  <button
                    onClick={() => {
                      setDate(key);
                      setMode("day");
                    }}
                    className="mb-2 text-xs font-semibold text-gold-300"
                  >
                    {formatDate(key, "EEE d MMM")}
                  </button>
                  <div className="space-y-2">
                    {items.slice(0, mode === "month" ? 3 : 8).map((l) => (
                      <ServiceBlock key={l.key} leg={l} />
                    ))}
                    {items.length > (mode === "month" ? 3 : 8) && (
                      <button
                        className="text-xs text-gold-300"
                        onClick={() => {
                          setDate(key);
                          setMode("day");
                        }}
                      >
                        Ver {items.length} servicios
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-[10px] text-ink-500">
        Horario local de Quintana Roo. Los bloques indican salidas; no estiman
        la duración del traslado.
      </p>
    </div>
  );
}
