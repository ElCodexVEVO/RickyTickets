import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCustomers } from "@/features/customers/hooks";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { useReservations } from "@/features/reservations/hooks";
import { customerCompletedAmounts } from "@/lib/reports";
import { QueryState } from "@/components/ui/QueryState";
import { Badge } from "@/components/ui/Badge";

export default function CustomersPage() {
  const { data: customers, isLoading, isError } = useCustomers();
  const reservations = useReservations({});
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!customers) return [];
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) =>
      [c.full_name, c.phone, c.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(term)),
    );
  }, [customers, search]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Historial de servicios y gasto total por cliente."
      />
      <QueryState loading={isLoading} error={reservations.error} />

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <div className="p-6">
            <EmptyState
              icon={Users2}
              title="No se pudo conectar a Supabase"
              description="Configura tus credenciales en .env.local."
            />
          </div>
        ) : !isLoading && filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users2}
              title="Sin clientes"
              description="Los clientes se crean automáticamente al generar un ticket."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Servicios</th>
                  <th className="px-4 py-3">Último servicio</th>
                  <th className="px-4 py-3">Total gastado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line last:border-0 hover:bg-surface-950"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/clientes/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-carbon-950 text-xs font-semibold text-gold-400">
                          {initials(c.full_name)}
                        </div>
                        <span className="font-medium text-ink-900 hover:text-gold-700">
                          {c.full_name}{" "}
                          {(reservations.data?.filter(
                            (r) =>
                              r.customer_id === c.id &&
                              r.status !== "cancelled",
                          ).length ?? 0) > 1 && (
                            <Badge tone="positive">Frecuente</Badge>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-500">
                      <p>{c.phone ?? "—"}</p>
                      <p className="text-xs">{c.email ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">{c.total_services}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {c.last_service_at ? formatDate(c.last_service_at) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {reservations.data
                        ? customerCompletedAmounts(reservations.data, c.id).map(
                            (a) => (
                              <p key={a.currency}>
                                {formatCurrency(a.total, a.currency)}{" "}
                                {a.currency}
                              </p>
                            ),
                          )
                        : "—"}
                      <p className="mt-1 text-[10px] text-ink-500">
                        Servicios completados
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
