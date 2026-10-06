import type {
  CurrencyCode,
  ReservationWithRelations,
} from "@/types/database.types";
export function reportSummary(
  all: ReservationWithRelations[],
  from: string,
  to: string,
  currency: CurrencyCode,
) {
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
    drivers: grouped((r) => r.driver?.full_name ?? "Sin asignar"),
    vehicles: grouped((r) =>
      r.vehicle
        ? `${r.vehicle.brand} ${r.vehicle.model} · ${r.vehicle.plate}`
        : "Sin asignar",
    ),
    payments: grouped((r) => r.payment_method ?? "Sin definir"),
  };
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
        "Conductor",
        "Vehículo",
        "Precio",
        "Moneda",
        "Método",
        "Estado",
      ],
      ...rows.map((r) => [
        r.folio,
        r.customer?.full_name,
        `${r.pickup_point} → ${r.dropoff_point}`,
        r.date,
        r.time.slice(0, 5),
        r.service_type === "redondo"
          ? (r.return_time?.slice(0, 5) ?? "Por determinar")
          : "Solo ida",
        r.driver?.full_name,
        r.vehicle?.plate,
        r.price,
        r.currency,
        r.payment_method,
        r.status,
      ]),
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
