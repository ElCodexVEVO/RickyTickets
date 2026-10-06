import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import {
  useCustomer,
  useCustomerReservations,
  useCustomerNotes,
} from "@/features/customers/hooks";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { customerCompletedAmounts } from "@/lib/reports";
import { returnTimeLabel } from "@/lib/operations";
import { QueryState } from "@/components/ui/QueryState";
import { Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const customerQuery = useCustomer(id);
  const { data: customer, isLoading } = customerQuery;
  const reservationQuery = useCustomerReservations(id);
  const reservations = reservationQuery.data;
  const saveNotes = useCustomerNotes(id ?? "");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setNotes(customer?.notes ?? "");
  }, [customer]);

  if (isLoading) return <FullScreenLoader />;
  if (customerQuery.isError)
    return (
      <QueryState
        error={customerQuery.error}
        retry={() => void customerQuery.refetch()}
      />
    );
  if (!customer) return <p>Cliente no encontrado.</p>;

  return (
    <div>
      <Link
        to="/clientes"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clientes
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-carbon-950 text-lg font-semibold text-gold-400">
          {initials(customer.full_name)}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">
            {customer.full_name}
          </h1>
          <p className="text-sm text-ink-500">
            {customer.phone} {customer.email && `· ${customer.email}`}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-ink-500">
            Servicios
          </p>
          <p className="mt-1 font-display text-xl font-semibold">
            {customer.total_services}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-ink-500">
            Total gastado
          </p>
          <div className="mt-1 text-sm font-semibold">
            {reservations
              ? customerCompletedAmounts(reservations, customer.id).map((a) => (
                  <p key={a.currency}>
                    {formatCurrency(a.total, a.currency)} {a.currency}
                  </p>
                ))
              : "—"}
          </div>
          <p className="mt-1 text-[10px] text-ink-500">
            Servicios completados · por moneda
          </p>
        </Card>
        <Card className="p-4 col-span-2 sm:col-span-2">
          <p className="text-xs font-medium uppercase text-ink-500">
            Último servicio
          </p>
          <p className="mt-1 font-display text-xl font-semibold">
            {customer.last_service_at
              ? formatDate(customer.last_service_at)
              : "—"}
          </p>
        </Card>
      </div>
      <Card className="mb-5 p-4">
        <h2 className="mb-3 text-sm font-semibold">Notas del cliente</h2>
        <Textarea
          aria-label="Notas del cliente"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            loading={saveNotes.isPending}
            onClick={() => saveNotes.mutate(notes)}
          >
            Guardar notas
          </Button>
          <span className="text-xs text-ink-500">
            VIP: sin clasificación registrada en el modelo actual.
          </span>
        </div>
        <QueryState error={saveNotes.error} />
        {saveNotes.isSuccess && (
          <p className="mt-2 text-xs text-positive-700">Notas guardadas.</p>
        )}
      </Card>
      <QueryState
        loading={reservationQuery.isPending}
        error={reservationQuery.error}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <h2 className="font-display text-base font-semibold text-ink-900">
            Historial de reservaciones
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ruta</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Regreso</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reservations?.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-line last:border-0 hover:bg-surface-950"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/reservaciones/${r.id}`}
                      className="font-mono-tab text-xs text-gold-700"
                    >
                      {r.folio}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-ink-700">
                    {r.pickup_point} → {r.dropoff_point}
                  </td>
                  <td className="px-4 py-3">
                    {r.price != null
                      ? formatCurrency(r.price, r.currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {returnTimeLabel(r.return_time, r.service_type)}
                  </td>
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
