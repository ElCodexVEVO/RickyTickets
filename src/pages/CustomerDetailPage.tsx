import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { useCustomer, useCustomerReservations } from "@/features/customers/hooks";
import { formatCurrency, formatDate, initials } from "@/lib/format";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: reservations } = useCustomerReservations(id);

  if (isLoading) return <FullScreenLoader />;
  if (!customer) return <p>Cliente no encontrado.</p>;

  return (
    <div>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-carbon-950 text-lg font-semibold text-gold-400">
          {initials(customer.full_name)}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">{customer.full_name}</h1>
          <p className="text-sm text-ink-500">
            {customer.phone} {customer.email && `· ${customer.email}`}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-ink-500">Servicios</p>
          <p className="mt-1 font-display text-xl font-semibold">{customer.total_services}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-ink-500">Total gastado</p>
          <p className="mt-1 font-display text-xl font-semibold">{formatCurrency(customer.total_spent)}</p>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-2">
          <p className="text-xs font-medium uppercase text-ink-500">Último servicio</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {customer.last_service_at ? formatDate(customer.last_service_at) : "—"}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-cream-200 p-4">
          <h2 className="font-display text-base font-semibold text-ink-900">Historial de reservaciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-200 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations?.map((r) => (
                <tr key={r.id} className="border-b border-cream-200 last:border-0 hover:bg-cream-50">
                  <td className="px-4 py-3">
                    <Link to={`/reservaciones/${r.id}`} className="font-mono-tab text-xs text-gold-700">
                      {r.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {r.pickup_point} → {r.dropoff_point}
                  </td>
                  <td className="px-4 py-3">{r.price != null ? formatCurrency(r.price, r.currency) : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
