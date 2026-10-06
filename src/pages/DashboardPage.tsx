import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Clock,
  UserRound,
  Wrench,
  Sun,
  Moon,
  AlertTriangle,
  BarChart3,
  Route,
  CircleCheck,
  Car,
  Users,
  Bell,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReservations } from "@/features/reservations/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import {
  operationDate,
  operationClock,
  serviceLegs,
  operationAlerts,
} from "@/lib/operations";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { QueryState } from "@/components/ui/QueryState";
import {
  OperationsMap,
  type ServiceFocusRequest,
} from "@/components/operations/OperationsMap";
import { alertServiceKey } from "@/lib/operationsMap";
import { OperationTable } from "@/components/operations/OperationTable";
import { DispatchBoard } from "@/components/operations/DispatchBoard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { useRevenueTrend } from "@/features/dashboard/hooks";
import { Select } from "@/components/ui/Field";
import { formatDate, formatCurrency } from "@/lib/format";
import type { CurrencyCode } from "@/types/database.types";
export default function DashboardPage() {
  const { profile } = useAuth();
  const reservations = useReservations({});
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const [mapFocus, setMapFocus] = useState<ServiceFocusRequest>();
  const [currency, setCurrency] = useState<CurrencyCode>("MXN");
  const [teamTab, setTeamTab] = useState<"drivers" | "vehicles">("drivers");
  const revenue = useRevenueTrend(currency);
  const today = operationDate();
  const clock = operationClock();
  const all = reservations.data ?? [];
  const mapLegs = serviceLegs(all);
  const legs = mapLegs.filter(
    (l) => l.date === today && l.reservation.status !== "cancelled",
  );
  const upcoming = legs.filter(
    (l) =>
      l.time &&
      l.time.slice(0, 5) >= clock &&
      !["completed", "in_service"].includes(l.reservation.status),
  );
  const alerts = operationAlerts(all, vehicles.data ?? [], drivers.data ?? []);
  const rows = all.filter((r) => r.date === today || r.return_date === today);
  const busy = reservations.isPending;
  const error = reservations.error || vehicles.error || drivers.error;
  const hour = Number(clock.slice(0, 2));
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const period = all.filter(
    (r) => r.date.slice(0, 7) === today.slice(0, 7) && r.status !== "cancelled",
  );
  const routeCounts = new Map<string, number>();
  period.forEach((r) => {
    const route = `${r.pickup_point} → ${r.dropoff_point}`;
    routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
  });
  const routes = [...routeCounts].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const confirmed = period.filter((r) =>
    ["confirmed", "in_service", "completed"].includes(r.status),
  ).length;
  const percent = period.length
    ? Math.round((confirmed / period.length) * 100)
    : 0;
  const total = revenue.data?.reduce((sum, point) => sum + point.total, 0);
  return (
    <div className="dashboard space-y-3">
      <div className="dashboard-hero -mx-4 -mt-4 flex items-center justify-between gap-4 px-5 py-5 xl:-mx-5">
        <div>
          <h1
            className="text-[28px] font-semibold leading-tight text-cream-100"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {greeting},{" "}
            <span className="text-cream-50">
              {profile?.full_name.split(" ")[0]}
            </span>
          </h1>
          <p className="mt-2 text-xs text-ink-700">
            Operación de hoy — {formatDate(today, "EEEE d 'de' MMMM yyyy")}
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 rounded-lg bg-carbon-950/50 px-3 py-2 sm:flex">
          {hour < 19 && hour >= 6 ? (
            <Sun size={30} className="text-gold-400" />
          ) : (
            <Moon size={27} className="text-gold-400" />
          )}
          <div>
            <p className="text-xs text-cream-100">Quintana Roo</p>
            <p className="font-mono-tab text-lg leading-tight">{clock}</p>
            <p className="text-[11px] text-ink-700">Hora local</p>
          </div>
        </div>
      </div>
      <QueryState
        error={error}
        retry={() => {
          void reservations.refetch();
          void vehicles.refetch();
          void drivers.refetch();
        }}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label="Servicios hoy"
          value={busy || error ? "—" : String(legs.length)}
          hint="Incluye ida y regreso"
        />
        <StatCard
          icon={Clock}
          tone="info"
          label="Próximos servicios"
          value={busy || error ? "—" : String(upcoming.length)}
          hint="Con hora confirmada"
        />
        <StatCard
          icon={UserRound}
          tone="danger"
          label="Sin conductor"
          value={
            busy || error
              ? "—"
              : String(
                  legs.filter(
                    (l) =>
                      !l.reservation.driver_id &&
                      l.reservation.status !== "completed",
                  ).length,
                )
          }
          hint="Requieren asignación"
        />
        <StatCard
          icon={Wrench}
          label="En mantenimiento"
          value={
            vehicles.isPending || error
              ? "—"
              : String(
                  vehicles.data?.filter((v) => v.status === "maintenance")
                    .length ?? 0,
                )
          }
          hint="Vehículos fuera de operación"
        />
      </div>
      <div className="dashboard-layout">
        <div className="min-w-0 space-y-3">
          <div className="dashboard-operation">
            <Card className="min-w-0 overflow-hidden">
              <div className="panel-heading">
                <div>
                  <h2>
                    <Clock size={17} className="text-gold-400" />
                    Operación de hoy
                  </h2>
                  <p className="mt-1 pl-[26px] text-xs text-ink-500">
                    Servicios y asignaciones del día
                  </p>
                </div>
                <Link to="/agenda">
                  Ver agenda <ArrowRight size={11} className="inline" />
                </Link>
              </div>
              {busy ? (
                <QueryState loading />
              ) : (
                !error && (
                  <>
                    <div className="dashboard-table max-h-[242px] overflow-y-auto">
                      <OperationTable legs={legs} compact />
                    </div>
                    <div className="dashboard-list max-h-[242px] overflow-y-auto">
                      {legs.map((l) => (
                        <Link
                          to={`/reservaciones/${l.reservation.id}`}
                          key={l.key}
                          className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-0 hover:bg-carbon-800/40"
                        >
                          <span className="w-10 shrink-0 font-mono-tab text-[13px]">
                            {l.time?.slice(0, 5) ?? "—"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-xs text-ink-500">
                              <span>{l.reservation.folio}</span>
                              <span className="text-gold-400">
                                {l.direction}
                              </span>
                            </p>
                            <p
                              className="mt-1 flex min-w-0 items-center gap-2 text-[13px]"
                              title={`${l.pickup} → ${l.dropoff} · ${l.reservation.passengers} pax · ${l.flight || "Sin vuelo"}`}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {l.pickup} → {l.dropoff}
                              </span>
                              <span className="shrink-0 text-[11px] text-ink-500">
                                {l.reservation.passengers} pax
                              </span>
                            </p>
                          </div>
                          <StatusBadge status={l.reservation.status} />
                        </Link>
                      ))}
                      {!legs.length && (
                        <p className="py-12 text-center text-xs text-ink-500">
                          Sin servicios para este día.
                        </p>
                      )}
                    </div>
                  </>
                )
              )}
            </Card>
          </div>
          <OperationsMap
            reservations={all}
            vehicles={vehicles.data ?? []}
            drivers={drivers.data ?? []}
            focusRequest={mapFocus}
            loading={busy}
            error={error}
          />
          <Card className="overflow-hidden">
            <div className="panel-heading">
              <div>
                <h2>
                  <Users size={17} className="text-gold-400" />
                  Tablero de despacho
                </h2>
                <p className="mt-1 pl-[26px] text-xs text-ink-500">
                  Asigna el equipo y actualiza el estado de los servicios
                </p>
              </div>
              <Link to="/reservaciones">Ver todos →</Link>
            </div>
            <div className="p-3">
              {busy ? (
                <QueryState loading />
              ) : (
                !error && <DispatchBoard reservations={rows} compact />
              )}
            </div>
          </Card>
        </div>
        <div className="dashboard-side">
          <Card className="overflow-hidden">
            <div className="panel-heading">
              <h2>
                <Bell size={16} className="text-danger-500" />
                Alertas
              </h2>
              <span className="rounded-full bg-danger-500/15 px-2 py-0.5 text-[11px] text-danger-500">
                {alerts.length}
              </span>
            </div>
            <QueryState loading={busy} error={error} />
            <div className="max-h-[302px] overflow-y-auto px-3">
              {alerts.map((a) => (
                <div
                  key={a.key}
                  className="flex gap-2.5 border-b border-line py-3 last:border-0"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-pending-500/10 text-pending-500">
                    <AlertTriangle size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-pending-500">
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">
                      {a.description}
                    </p>
                    {alertServiceKey(a, mapLegs, today) && (
                      <button
                        type="button"
                        aria-label={`Ver en mapa: ${a.title} · ${a.description}`}
                        className="mt-2 text-xs text-gold-400"
                        onClick={() => {
                          const legKey = alertServiceKey(a, mapLegs, today);
                          if (legKey)
                            setMapFocus((previous) => ({
                              legKey,
                              sequence: (previous?.sequence ?? 0) + 1,
                            }));
                        }}
                      >
                        Ver en mapa →
                      </button>
                    )}
                    {a.reservationId && (
                      <Link
                        to={`/reservaciones/${a.reservationId}`}
                        className="mt-2 ml-3 inline-block text-xs text-ink-700"
                      >
                        Ver reservación
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {!busy && !error && !alerts.length && (
                <p className="py-6 text-xs text-ink-500">
                  Sin alertas operativas.
                </p>
              )}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="panel-heading">
              <h2 className="text-xs!">Conductores y vehículos</h2>
              <Link to={teamTab === "drivers" ? "/conductores" : "/vehiculos"}>
                Ver todos →
              </Link>
            </div>
            <div className="p-3">
              <div className="mb-3 grid grid-cols-2 rounded-md border border-line bg-carbon-950 p-0.5">
                <button
                  onClick={() => setTeamTab("drivers")}
                  className={`rounded px-1 py-1.5 text-xs ${teamTab === "drivers" ? "bg-gold-400 text-carbon-950" : "text-ink-500"}`}
                >
                  Conductores ({drivers.data?.length ?? "—"})
                </button>
                <button
                  onClick={() => setTeamTab("vehicles")}
                  className={`rounded px-1 py-1.5 text-xs ${teamTab === "vehicles" ? "bg-gold-400 text-carbon-950" : "text-ink-500"}`}
                >
                  Vehículos ({vehicles.data?.length ?? "—"})
                </button>
              </div>
              <QueryState
                loading={drivers.isPending || vehicles.isPending}
                error={drivers.error || vehicles.error}
              />
              {teamTab === "drivers"
                ? drivers.data?.slice(0, 4).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 border-b border-line py-2 last:border-0"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-carbon-700 text-xs text-gold-300">
                        {d.full_name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px]">{d.full_name}</p>
                        <p className="truncate text-[11px] text-ink-500">
                          {vehicles.data?.find((v) => v.id === d.vehicle_id)
                            ?.model ?? "Sin vehículo asignado"}
                        </p>
                      </div>
                    </div>
                  ))
                : vehicles.data?.slice(0, 4).map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 border-b border-line py-2 last:border-0"
                    >
                      <Car size={21} className="text-gold-400" />
                      <div>
                        <p className="text-[13px]">
                          {v.brand} {v.model}
                        </p>
                        <p className="text-[11px] text-ink-500">{v.plate}</p>
                      </div>
                    </div>
                  ))}
              {!drivers.isPending &&
                !vehicles.isPending &&
                !(teamTab === "drivers"
                  ? drivers.data?.length
                  : vehicles.data?.length) && (
                  <div className="py-2 text-center">
                    <UserRound size={24} className="mx-auto text-ink-500" />
                    <p className="mt-2 text-[13px] text-ink-500">
                      {teamTab === "drivers"
                        ? "Sin conductores registrados"
                        : "Sin vehículos registrados"}
                    </p>
                    <Link
                      className="mt-2 inline-block text-xs text-gold-400"
                      to={teamTab === "drivers" ? "/conductores" : "/vehiculos"}
                    >
                      Agregar al directorio →
                    </Link>
                  </div>
                )}
            </div>
          </Card>
        </div>
      </div>
      <div className="dashboard-insights">
        <Card className="overflow-hidden">
          <div className="panel-heading">
            <h2>
              <BarChart3 size={17} className="text-gold-400" />
              Importe del mes
            </h2>
            <Select
              aria-label="Moneda del gráfico"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="h-6 w-16 px-1 text-xs"
            >
              <option>MXN</option>
              <option>USD</option>
            </Select>
          </div>
          <div className="p-3">
            <p className="mb-2 text-lg font-semibold">
              {total != null
                ? `${formatCurrency(total, currency)} ${currency}`
                : "—"}
            </p>
            <QueryState loading={revenue.isPending} error={revenue.error} />
            {revenue.data && (
              <RevenueChart
                data={revenue.data}
                currency={currency}
                height={56}
              />
            )}
            <p className="mt-2 text-[11px] text-ink-500">
              Servicios confirmados; no equivale a cobros.
            </p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="panel-heading">
            <h2>
              <Route size={17} className="text-gold-400" />
              Rutas más solicitadas
            </h2>
            <span className="text-[11px] text-ink-500">Este mes</span>
          </div>
          <div className="space-y-2 p-3">
            <QueryState loading={busy} error={reservations.error} />
            {routes.map(([route, count], i) => (
              <div key={route} className="flex items-center gap-2 text-xs">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-carbon-700 text-[11px]">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate" title={route}>
                  {route}
                </span>
                <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-carbon-700">
                  <span
                    className="block h-full rounded-full bg-gold-400"
                    style={{
                      width: `${(count / (routes[0]?.[1] || 1)) * 100}%`,
                    }}
                  />
                </span>
                <span className="w-5 text-right text-ink-500">{count}</span>
              </div>
            ))}
            {!busy && !error && !routes.length && (
              <p className="py-8 text-center text-xs text-ink-500">
                Sin servicios este mes.
              </p>
            )}
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="panel-heading">
            <h2>
              <CircleCheck size={17} className="text-gold-400" />
              Estado de reservaciones
            </h2>
            <span className="text-[11px] text-ink-500">Este mes</span>
          </div>
          <div className="flex items-center justify-center gap-5 p-4">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#49bb87 0% ${percent}%, #d5ac50 ${percent}% 100%)`,
              }}
            >
              <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-surface-900">
                <span className="text-xl font-semibold">
                  {busy || error ? "—" : `${percent}%`}
                </span>
                <span className="text-[8px] text-ink-500">Confirmadas</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <p>
                <span className="mr-2 inline-block h-2 w-2 rounded-sm bg-positive-500" />
                Confirmadas{" "}
                <strong className="ml-2">
                  {busy || error ? "—" : confirmed}
                </strong>
              </p>
              <p>
                <span className="mr-2 inline-block h-2 w-2 rounded-sm bg-gold-400" />
                Pendientes{" "}
                <strong className="ml-2">
                  {busy || error ? "—" : period.length - confirmed}
                </strong>
              </p>
              <p className="text-[11px] text-ink-500">
                Incluye servicios en curso
                <br />y completados.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
