import type {
  CurrencyCode,
  ReservationWithRelations,
} from "@/types/database.types";
import { isDraft } from "@/lib/operations";
import { paymentStatusLabels, paymentSummary } from "@/lib/payments";
export function reportSummary(
  everything: ReservationWithRelations[],
  from: string,
  to: string,
  currency: CurrencyCode,
) {
  // Los borradores no son reservaciones confirmadas: no cuentan en reportes.
  const all = everything.filter((r) => !isDraft(r));
  const rows = all.filter(
    (r) => r.date >= from && r.date <= to && r.currency === currency,
  );
  const billable = rows.filter((r) =>
    ["confirmed", "in_service", "completed"].includes(r.status),
  );
  const total = billable.reduce((sum, r) => sum + (r.price ?? 0), 0);
  const grouped = (key: (r: ReservationWithRelations) => string) => {
    const map = new Map<string, number>();
    for (const r of rows.filter((r) => r.status !== "cancelled")) {
      const label = key(r);
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map, ([label, count]) => ({ label, count })).sort(
      (a, b) => b.count - a.count,
    );
  };
  const customerIds = new Set(
    rows.filter((r) => r.status !== "cancelled").map((r) => r.customer_id),
  );
  const previous = new Set(
    all
      .filter((r) => r.date < from && r.status !== "cancelled")
      .map((r) => r.customer_id),
  );
  const recurrent = Array.from(customerIds).filter((id) =>
    previous.has(id),
  ).length;
  const months = new Map<string, { total: number; count: number }>();
  for (const r of billable) {
    const key = r.date.slice(0, 7);
    const item = months.get(key) ?? { total: 0, count: 0 };
    item.total += r.price ?? 0;
    item.count++;
    months.set(key, item);
  }
  return {
    rows,
    total,
    billable: billable.length,
    average: billable.length ? total / billable.length : 0,
    cancellations: rows.filter((r) => r.status === "cancelled").length,
    newCustomers: customerIds.size - recurrent,
    recurrentCustomers: recurrent,
    months: Array.from(months, ([month, values]) => ({
      month,
      ...values,
    })).sort((a, b) => a.month.localeCompare(b.month)),
    routes: grouped((r) => `${r.pickup_point} → ${r.dropoff_point}`),
    payments: grouped((r) => r.payment_method ?? "Sin definir"),
    paymentStatus: grouped((r) => reservationPaymentLabel(r)),
  };
}
// Reservaciones anteriores a 0008 no tienen anticipo registrado.
export function reservationPaymentLabel(
  r: Pick<ReservationWithRelations, "price" | "deposit">,
) {
  return r.deposit == null
    ? "Sin registro"
    : paymentStatusLabels[paymentSummary(r.price, r.deposit).status];
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function reservationCsv(rows: ReservationWithRelations[]) {
  return (
    "\ufeff" +
    [
      [
        "Folio",
        "Cliente",
        "Ruta",
        "Fecha",
        "Hora ida",
        "Hora regreso",
        "Precio",
        "Anticipo",
        "Restante",
        "Moneda",
        "Método",
        "Estado de pago",
        "Estado",
      ],
      ...rows.map((r) => {
        const payment = paymentSummary(r.price, r.deposit);
        return [
          r.folio,
          r.customer?.full_name,
          `${r.pickup_point} → ${r.dropoff_point}`,
          r.date,
          r.time.slice(0, 5),
          r.service_type === "redondo"
            ? (r.return_time?.slice(0, 5) ?? "Por determinar")
            : "Solo ida",
          r.price,
          r.deposit ?? "",
          r.deposit == null ? "" : payment.remaining,
          r.currency,
          r.payment_method,
          reservationPaymentLabel(r),
          r.status,
        ];
      }),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function customerCompletedAmounts(
  rows: ReservationWithRelations[],
  customerId: string,
) {
  return (["MXN", "USD"] as const).map((currency) => ({
    currency,
    total: rows
      .filter(
        (r) =>
          r.customer_id === customerId &&
          r.currency === currency &&
          r.status === "completed",
      )
      .reduce((sum, r) => sum + (r.price ?? 0), 0),
  }));
}
