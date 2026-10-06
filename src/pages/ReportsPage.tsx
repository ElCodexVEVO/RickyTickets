import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Printer,
  DollarSign,
  ListChecks,
  Receipt,
  Ban,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { QueryState } from "@/components/ui/QueryState";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select } from "@/components/ui/Field";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { useReservations } from "@/features/reservations/hooks";
import { operationDate } from "@/lib/operations";
import { reportSummary, reservationCsv } from "@/lib/reports";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode, ReservationStatus } from "@/types/database.types";
function Breakdown({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {items.length ? (
        items.slice(0, 15).map((item) => (
          <div
            key={item.label}
            className="flex justify-between gap-3 border-b border-line py-2 text-xs last:border-0"
          >
            <span className="text-ink-700">{item.label}</span>
            <span className="font-mono-tab text-gold-300">{item.count}</span>
          </div>
        ))
      ) : (
        <p className="text-xs text-ink-500">Sin datos en este periodo.</p>
      )}
    </Card>
  );
}
export default function ReportsPage() {
  const today = operationDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [currency, setCurrency] = useState<CurrencyCode>("MXN");
  const query = useReservations({});
  const report = useMemo(
    () => reportSummary(query.data ?? [], from, to, currency),
    [query.data, from, to, currency],
  );
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([reservationCsv(report.rows)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `DannyTransfers-${from}-${to}-${currency}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reportes"
        subtitle="Importes de reservaciones y actividad operativa por periodo y moneda."
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={!query.data || from > to}
              onClick={exportCsv}
            >
              <Download size={15} />
              CSV / Excel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Imprimir / PDF
            </Button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldWrapper label="Desde" htmlFor="report-from">
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FieldWrapper>
        <FieldWrapper label="Hasta" htmlFor="report-to">
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </FieldWrapper>
        <FieldWrapper label="Moneda" htmlFor="report-currency">
          <Select
            id="report-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          >
            <option>MXN</option>
            <option>USD</option>
          </Select>
        </FieldWrapper>
      </div>
      {from > to && (
        <p role="alert" className="text-sm text-danger-500">
          La fecha inicial debe ser anterior a la final.
        </p>
      )}
      <QueryState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && from <= to && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={DollarSign}
              label={`Importe ${currency}`}
              value={formatCurrency(report.total, currency)}
              tone="positive"
            />
            <StatCard
              icon={ListChecks}
              label="Reservaciones"
              value={String(report.rows.length)}
            />
            <StatCard
              icon={Receipt}
              label="Ticket promedio"
              value={formatCurrency(report.average, currency)}
            />
            <StatCard
              icon={Ban}
              label="Cancelaciones"
              value={String(report.cancellations)}
            />
          </div>
          <p className="text-xs text-ink-500">
            Importe: confirmadas, en servicio y completadas. No representa
            cobros recibidos. Se excluyen cancelaciones y borradores; las
            monedas se calculan por separado. El estado de pago usa el anticipo
            registrado desde la migración 0008.
          </p>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="min-w-0 p-4">
              <h2 className="mb-3 text-sm font-semibold">
                Importes por mes · {currency}
              </h2>
              {report.months.length ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={report.months}>
                    <CartesianGrid vertical={false} stroke="#29343c" />
                    <XAxis
                      dataKey="month"
                      stroke="#94a2ab"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis stroke="#94a2ab" tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v), currency)}
                      contentStyle={{
                        background: "#151d22",
                        border: "1px solid #2c373e",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="total"
                      name="Importe"
                      fill="#d5ac50"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-ink-500">
                  Sin importes registrados.
                </p>
              )}
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">
                Reservaciones por estado
              </h2>
              {(
                [
                  "pending",
                  "confirmed",
                  "in_service",
                  "completed",
                  "cancelled",
                ] as ReservationStatus[]
              ).map((s) => (
                <div key={s} className="mb-2 flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-sm">
                    {report.rows.filter((r) => r.status === s).length}
                  </span>
                </div>
              ))}
              <div className="mt-4 border-t border-line pt-3 text-xs">
                <p>Clientes nuevos: {report.newCustomers}</p>
                <p className="mt-2">
                  Clientes recurrentes: {report.recurrentCustomers}
                </p>
                <p className="mt-2 text-[10px] text-ink-500">
                  Recurrente = tiene un servicio previo al periodo. Se usa el
                  historial completo de ambas monedas.
                </p>
              </div>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Breakdown title="Rutas más solicitadas" items={report.routes} />
            <Breakdown title="Métodos de pago" items={report.payments} />
            <Breakdown title="Estado de pago" items={report.paymentStatus} />
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="text-left text-ink-500">
                    {["Folio", "Fecha", "Ruta", "Importe", "Estado"].map(
                      (h) => (
                        <th key={h} className="p-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="p-3 font-mono-tab">{r.folio}</td>
                      <td className="p-3">{r.date}</td>
                      <td className="p-3">
                        {r.pickup_point} → {r.dropoff_point}
                      </td>
                      <td className="p-3">
                        {formatCurrency(r.price, r.currency)}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!report.rows.length && (
                <p className="p-8 text-center text-sm text-ink-500">
                  Sin reservaciones en este periodo y moneda.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
