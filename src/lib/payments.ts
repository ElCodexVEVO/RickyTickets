// Estado de pago derivado del total y el anticipo. No se guarda: siempre se calcula
// a partir de reservations.price y reservations.deposit.
export type PaymentStatus = "pending" | "partial" | "paid";

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  partial: "Anticipo",
  paid: "Pagado",
};

// El ticket es un documento para el cliente y va en inglés.
export const paymentStatusLabelsEn: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  partial: "Deposit paid",
  paid: "Paid",
};

export interface PaymentSummary {
  total: number | null;
  deposit: number;
  remaining: number | null;
  status: PaymentStatus;
}

export function toAmount(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

// anticipo = 0 → Pendiente · 0 < anticipo < total → Anticipo · anticipo ≥ total → Pagado.
// Sin total todavía (borrador), un anticipo se considera parcial.
export function paymentSummary(
  price: string | number | null | undefined,
  deposit: string | number | null | undefined,
): PaymentSummary {
  const total = toAmount(price);
  const paid = Math.max(toAmount(deposit) ?? 0, 0);
  const remaining =
    total == null ? null : Math.round(Math.max(total - paid, 0) * 100) / 100;
  const status: PaymentStatus =
    paid <= 0 ? "pending" : total == null || paid < total ? "partial" : "paid";
  return { total, deposit: paid, remaining, status };
}
