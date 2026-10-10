import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarRange } from "lucide-react";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { ReservationActions } from "@/components/reservations/ReservationActions";
import { useReservations } from "@/features/reservations/hooks";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import type { ReservationStatus } from "@/types/database.types";
import { AgendaView } from "@/components/operations/AgendaView";
import { DispatchBoard } from "@/components/operations/DispatchBoard";
import { Badge } from "@/components/ui/Badge";
import { QueryState } from "@/components/ui/QueryState";
import { PaymentStatusBadge } from "@/components/tickets/PaymentStatusBadge";
import { returnTimeLabel } from "@/lib/operations";
import { paymentSummary } from "@/lib/payments";

const STATUS_OPTIONS: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_service", label: "En servicio" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

export default function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "agenda" | "operations">("table");
  const [status, setStatus] = useState<ReservationStatus | "all">("all");

  const filters = useMemo(() => ({ search, status }), [search, status]);
  const { data: reservations, isLoading, isError } = useReservations(filters);

  return (
    <div>
      <PageHeader
        title="Reservaciones"
        subtitle="Administra, edita o busca tus reservaciones."
        actions={
          <Link to="/ticket/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nueva reservación
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, vuelo, teléfono, folio..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as ReservationStatus | "all")
          }
          className="sm:w-56"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="mb-4 flex gap-1">
        {(["table", "agenda", "operations"] as const).map((v, i) => (
          <Button
            key={v}
            size="sm"
            variant={v === view ? "primary" : "secondary"}
            onClick={() => setView(v)}
          >
            {["Tabla", "Agenda", "Operaciones"][i]}
          </Button>
        ))}
      </div>
      {isLoading && <QueryState loading />}
      {view === "agenda" && !isLoading && !isError && (
        <AgendaView reservations={reservations ?? []} />
      )}
      {view === "operations" && !isLoading && !isError && (
        <DispatchBoard
          reservations={(reservations ?? []).filter(
            (r) => r.status !== "draft",
          )}
        />
      )}

      {(view === "table" || isError) && (
        <Card className="overflow-hidden">
          {isError ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarRange}
                title="No se pudo conectar a Supabase"
                description="Configura tus credenciales en .env.local para ver las reservaciones reales."
              />
            </div>
          ) : !isLoading && (reservations?.length ?? 0) === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarRange}
                title="Sin reservaciones"
                description="Crea tu primer ticket para verlo aquí."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora ida</th>
                    <th className="px-4 py-3">Hora regreso</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Personas</th>
                    <th className="px-4 py-3">Vuelo</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations?.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-line last:border-0 hover:bg-surface-950"
                    >
                      <td className="px-4 py-3 font-mono-tab text-xs text-ink-700">
                        {r.folio}
                        {r.amaya_code && (
                          <p className="mt-1 text-xs text-ink-500">
                            Amaya · {r.amaya_code}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">
                          {r.customer?.full_name ?? "—"}
                        </p>
                        <p className="text-xs text-ink-500">
                          {r.customer?.phone}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(r.date, "d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatTime(r.time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.service_type === "redondo" ? (
                          <>
                            <Badge tone={r.return_time ? "neutral" : "warning"}>
                              {returnTimeLabel(r.return_time)}
                            </Badge>
                            <p className="mt-1 text-[10px] text-ink-500">
                              {formatDate(r.return_date)}
                            </p>
                          </>
                        ) : (
                          "Solo ida"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-ink-700">
                          {r.pickup_point} → {r.dropoff_point}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{r.passengers}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-500">
                        {r.flight_number ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {r.price != null
                          ? formatCurrency(r.price, r.currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-500">
                        {r.deposit == null ? (
                          <span className="text-[11px]">Sin registro</span>
                        ) : (
                          <PaymentStatusBadge
                            status={paymentSummary(r.price, r.deposit).status}
                          />
                        )}
                        <p className="mt-1 text-[10px]">
                          {r.payment_method ?? "Sin método"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ReservationActions reservation={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
