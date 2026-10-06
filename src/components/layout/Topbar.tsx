import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CircleHelp, Menu, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReservations } from "@/features/reservations/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useCustomers } from "@/features/customers/hooks";
import { operationAlerts } from "@/lib/operations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { QueryState } from "@/components/ui/QueryState";
export function Topbar({
  onMenuClick,
  onCreate,
}: {
  onMenuClick: () => void;
  onCreate: () => void;
}) {
  const { profile, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<
    "help" | "notifications" | "profile" | null
  >(null);
  const reservations = useReservations({});
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const customers = useCustomers();
  const alerts = operationAlerts(
    reservations.data ?? [],
    vehicles.data ?? [],
    drivers.data ?? [],
  );
  const term = search.trim().toLowerCase();
  const matches = (values: (string | null | undefined)[]) =>
    values.some((v) => v?.toLowerCase().includes(term));
  const results =
    term.length < 2
      ? []
      : [
          ...(reservations.data ?? [])
            .filter((r) =>
              matches([
                r.folio,
                r.customer?.full_name,
                r.customer?.phone,
                r.flight_number,
                r.return_flight_number,
                r.driver?.full_name,
                r.vehicle?.plate,
                r.vehicle?.brand,
                r.vehicle?.model,
              ]),
            )
            .map((r) => ({
              key: r.id,
              to: `/reservaciones/${r.id}`,
              label: r.folio,
              description: `${r.customer?.full_name ?? "Cliente"} · ${r.pickup_point} → ${r.dropoff_point}`,
            })),
          ...(customers.data ?? [])
            .filter((c) => matches([c.full_name, c.phone, c.email]))
            .map((c) => ({
              key: c.id,
              to: `/clientes/${c.id}`,
              label: c.full_name,
              description: `Cliente · ${c.phone ?? "Sin teléfono"}`,
            })),
          ...(drivers.data ?? [])
            .filter((d) => matches([d.full_name, d.phone]))
            .map((d) => ({
              key: d.id,
              to: "/conductores",
              label: d.full_name,
              description: "Conductor",
            })),
          ...(vehicles.data ?? [])
            .filter((v) => matches([v.brand, v.model, v.plate]))
            .map((v) => ({
              key: v.id,
              to: "/vehiculos",
              label: `${v.brand} ${v.model}`,
              description: `Vehículo · ${v.plate}`,
            })),
        ].slice(0, 12);
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-line bg-carbon-950 px-4 sm:px-5">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menú"
          className="rounded-lg p-2 text-ink-700 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="relative mr-auto min-w-0 flex-1 max-w-[490px]">
          <Search
            className="pointer-events-none absolute left-3 top-3 text-ink-500"
            size={16}
          />
          <Input
            aria-label="Buscador global"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearch("");
            }}
            placeholder="Buscar reservación, cliente, vuelo, folio, conductor o vehículo..."
            className="h-9 bg-carbon-900 pl-9 pr-8 text-xs"
          />
          {search && (
            <button
              aria-label="Cerrar búsqueda"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 p-1"
            >
              <X size={16} />
            </button>
          )}
          {term.length >= 2 && (
            <div className="absolute left-0 right-0 top-12 max-h-96 overflow-y-auto rounded-xl border border-line bg-carbon-900 p-2 shadow-xl">
              {reservations.isPending || customers.isPending ? (
                <QueryState loading />
              ) : reservations.isError || customers.isError ? (
                <QueryState error={true} />
              ) : results.length ? (
                results.map((r) => (
                  <Link
                    key={r.key}
                    to={r.to}
                    onClick={() => setSearch("")}
                    className="block rounded-lg px-3 py-2 hover:bg-carbon-800"
                  >
                    <p className="text-sm font-medium text-gold-300">
                      {r.label}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {r.description}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-3 text-sm text-ink-500">Sin coincidencias.</p>
              )}
            </div>
          )}
        </div>
        <Button onClick={onCreate} className="h-9 shrink-0">
          <Plus size={16} />
          <span className="hidden xl:inline">Nueva reservación</span>
          <span className="xl:hidden">Nueva</span>
        </Button>
        <button
          aria-label="Notificaciones"
          title="Notificaciones"
          onClick={() => setPanel("notifications")}
          className="relative rounded-lg p-2 text-ink-700 hover:bg-carbon-800"
        >
          <Bell size={19} />
          {alerts.length > 0 && (
            <span className="absolute right-0 top-0 h-4 min-w-4 rounded-full bg-danger-50 px-1 text-[9px] text-danger-500">
              {alerts.length}
            </span>
          )}
        </button>
        <button
          aria-label="Ayuda"
          title="Ayuda"
          onClick={() => setPanel("help")}
          className="hidden rounded-lg p-2 text-ink-700 hover:bg-carbon-800 sm:block"
        >
          <CircleHelp size={19} />
        </button>
        <button
          aria-label="Mi perfil"
          title={profile?.full_name}
          onClick={() => setPanel("profile")}
          className="hidden shrink-0 items-center gap-2 rounded-lg text-left text-xs sm:flex"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-carbon-800 text-gold-300">
            {profile?.full_name.slice(0, 1)}
          </span>
          <span className="hidden xl:block">
            <span className="block text-[11px]">
              {profile?.full_name.split(" ")[0]}
            </span>
            <span className="text-[9px] text-ink-500">
              {isAdmin ? "Administrador" : "Operador"}
            </span>
          </span>
        </button>
      </header>
      <Modal
        open={panel !== null}
        title={
          panel === "help"
            ? "Ayuda de operaciones"
            : panel === "profile"
              ? "Mi perfil"
              : "Alertas y notificaciones"
        }
        onClose={() => setPanel(null)}
      >
        {panel === "help" && (
          <div className="space-y-3 text-sm text-ink-700">
            <p>
              Crea una reservación en seis pasos. El folio se asigna al guardar
              y el PDF puede regenerarse desde su detalle.
            </p>
            <p>
              Para un regreso sin hora, activa «Por determinar». Podrás
              confirmarla después desde Reservaciones.
            </p>
            <p>
              Las advertencias de asignación revisan servicios cercanos. Revisa
              los tiempos reales de traslado antes de despachar.
            </p>
            <p>
              Agenda muestra los trayectos de ida y regreso; los regresos
              pendientes no ocupan una hora inventada.
            </p>
          </div>
        )}
        {panel === "profile" && (
          <div className="space-y-2 text-sm">
            <p>{profile?.full_name}</p>
            <p className="text-ink-500">
              {isAdmin ? "Administrador" : "Empleado"} · Cuenta activa
            </p>
          </div>
        )}
        {panel === "notifications" && (
          <div className="space-y-3">
            <QueryState
              loading={reservations.isPending}
              error={reservations.error}
            />
            {alerts.map((a) => (
              <div key={a.key} className="rounded-lg border border-line p-3">
                <p className="text-sm text-pending-500">{a.title}</p>
                <p className="mt-1 text-xs text-ink-500">{a.description}</p>
                {a.reservationId && (
                  <Link
                    to={`/reservaciones/${a.reservationId}`}
                    onClick={() => setPanel(null)}
                    className="mt-2 inline-block text-xs text-gold-400"
                  >
                    Abrir reservación →
                  </Link>
                )}
              </div>
            ))}
            {!reservations.isPending && !alerts.length && (
              <p className="text-sm text-ink-500">Sin alertas operativas.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
