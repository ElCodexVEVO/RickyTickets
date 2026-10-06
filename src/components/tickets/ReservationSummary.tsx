import type { ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Pencil } from "lucide-react";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { focusSection, sectionIds } from "./FormSection";
import {
  airlinePlaceholder,
  findAirline,
  paymentIconFor,
  statusIcons,
} from "@/lib/assets";
import { ServiceIcon } from "./ServiceIcon";
import { paymentSummary } from "@/lib/payments";
import { joinPhone } from "@/lib/phone";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  reservationFormDefaults,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import type {
  ReservationStatus,
  ServiceCatalogItemRow,
} from "@/types/database.types";

function Block({
  title,
  section,
  children,
}: {
  title: string;
  section: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line py-3 last:border-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-500">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => focusSection(section)}
          aria-label={`Editar ${title.toLowerCase()}`}
          className="inline-flex items-center gap-1 rounded text-xs text-gold-400 hover:text-gold-300"
        >
          <Pencil size={11} />
          Editar
        </button>
      </div>
      {children}
    </section>
  );
}

function Leg({
  label,
  from,
  to,
  date,
  time,
}: {
  label: string;
  from?: string;
  to?: string;
  date?: string;
  time: ReactNode;
}) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gold-400">
        {label}
      </p>
      <div className="relative space-y-1 pl-4 text-[13px] text-cream-50">
        <span className="absolute bottom-[7px] left-[3px] top-[7px] w-px bg-carbon-600" />
        <p className="relative">
          <span className="absolute -left-4 top-[6px] h-[7px] w-[7px] rounded-full bg-gold-400" />
          {from || <span className="text-ink-500">Recogida por definir</span>}
        </p>
        <p className="relative">
          <span className="absolute -left-4 top-[6px] h-[7px] w-[7px] rounded-full border border-gold-400 bg-carbon-900" />
          {to || <span className="text-ink-500">Destino por definir</span>}
        </p>
      </div>
      <p className="mt-1 flex items-center gap-1.5 pl-4 text-xs text-ink-500">
        <span>{date ? formatDate(date) : "Fecha por definir"}</span>
        <span aria-hidden="true">·</span>
        {time}
      </p>
    </div>
  );
}

export function ReservationSummary({
  folio,
  status,
  services,
  footer,
}: {
  folio?: string;
  status: ReservationStatus;
  services: ServiceCatalogItemRow[];
  footer?: ReactNode;
}) {
  const { control } = useFormContext<ReservationFormValues>();
  const v = {
    ...reservationFormDefaults,
    ...useWatch({ control }),
  } as ReservationFormValues;
  const service = services.find((s) => s.id === v.service_catalog_item_id);
  const roundTrip = v.service_type === "redondo";
  const payment = paymentSummary(v.price, v.deposit);
  const money = (amount: number | null) =>
    amount == null
      ? "Por definir"
      : `${formatCurrency(amount, v.currency)} ${v.currency}`;
  const phone = joinPhone(v.phone_country, v.customer_phone);
  const flightInfo =
    v.include_flight &&
    [v.airline, v.flight_number, v.flight_date, v.flight_time].some(Boolean);
  const airline = flightInfo
    ? findAirline(v.airline, v.flight_number)
    : undefined;
  const methodIcon = paymentIconFor(v.payment_method);

  return (
    <aside
      aria-label="Resumen de reservación"
      className="flex flex-col rounded-xl border border-line bg-white card-shadow xl:sticky xl:top-[76px] xl:max-h-[calc(100dvh-92px)]"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">Resumen de reservación</h2>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="font-mono-tab text-xs text-ink-500">
            {folio ? `#${folio}` : "Folio al guardar"}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <Block title="Cliente" section={sectionIds.client}>
          <p className="text-[13px] font-medium text-cream-50">
            {v.customer_full_name || (
              <span className="font-normal text-ink-500">Sin cliente</span>
            )}
          </p>
          {phone && <p className="mt-0.5 text-xs text-ink-500">{phone}</p>}
          {v.customer_email && (
            <p className="mt-0.5 truncate text-xs text-ink-500">
              {v.customer_email}
            </p>
          )}
          <p className="mt-0.5 text-xs text-ink-500">
            {Number.isFinite(v.passengers) ? v.passengers : "—"}{" "}
            {v.passengers === 1 ? "pasajero" : "pasajeros"}
          </p>
        </Block>

        <Block title="Servicio y ruta" section={sectionIds.route}>
          {service && (
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-cream-100">
              <ServiceIcon item={service} size={14} className="text-gold-400" />
              {service.label}
            </p>
          )}
          <Leg
            label={roundTrip ? "Ida" : "Solo ida"}
            from={v.pickup_point}
            to={v.dropoff_point}
            date={v.date}
            time={
              <span>{v.time ? v.time.slice(0, 5) : "Hora por definir"}</span>
            }
          />
          {roundTrip && (
            <Leg
              label="Regreso"
              from={v.return_pickup_point}
              to={v.return_dropoff_point}
              date={v.return_date}
              time={
                v.return_time_pending ? (
                  <span className="inline-flex items-center gap-1 text-gold-300">
                    <AssetIcon src={statusIcons.unknownTime} size={12} />
                    Por determinar
                  </span>
                ) : (
                  <span>
                    {v.return_time
                      ? v.return_time.slice(0, 5)
                      : "Hora por definir"}
                  </span>
                )
              }
            />
          )}
        </Block>

        <Block title="Vuelo" section={sectionIds.flight}>
          {flightInfo ? (
            <div className="flex items-start gap-2.5">
              {airline ? (
                <span className="flex h-7 w-[68px] shrink-0 items-center justify-center rounded-md bg-cream-50 px-1.5">
                  <img
                    src={airline.logo}
                    alt={airline.name}
                    className="max-h-4 w-full object-contain"
                  />
                </span>
              ) : (
                <img
                  src={airlinePlaceholder}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md"
                />
              )}
              <div className="min-w-0 text-[13px]">
                <p className="truncate text-cream-50">
                  {v.airline || airline?.name || "Aerolínea sin indicar"}
                </p>
                <p className="text-xs text-ink-500">
                  {[
                    v.flight_number,
                    v.flight_date && formatDate(v.flight_date),
                    v.flight_time?.slice(0, 5),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sin número de vuelo"}
                </p>
                {roundTrip && (v.return_airline || v.return_flight_number) && (
                  <p className="mt-0.5 text-xs text-ink-500">
                    Regreso:{" "}
                    {[v.return_airline, v.return_flight_number]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-500">Sin información</p>
          )}
        </Block>

        <Block title="Hotel" section={sectionIds.hotel}>
          {v.hotel || v.room ? (
            <p className="text-[13px] text-cream-50">
              {v.hotel || "Hotel sin nombre"}
              {v.room && (
                <span className="block text-xs text-ink-500">
                  Habitación {v.room}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-ink-500">Sin hotel</p>
          )}
        </Block>

        <Block title="Pago" section={sectionIds.payment}>
          <dl className="space-y-1 text-[13px]">
            {(
              [
                ["Total", money(payment.total)],
                ["Anticipo", money(payment.deposit)],
                ["Restante", money(payment.remaining)],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-ink-500">{label}</dt>
                <dd className="font-mono-tab text-cream-50">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              {methodIcon && <AssetIcon src={methodIcon} size={14} />}
              {v.payment_method || "Método sin definir"}
            </span>
            <PaymentStatusBadge status={payment.status} />
          </div>
        </Block>

        {v.notes && (
          <Block title="Notas" section={sectionIds.notes}>
            <p className="line-clamp-3 whitespace-pre-line text-xs text-ink-700">
              {v.notes}
            </p>
          </Block>
        )}
      </div>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </aside>
  );
}
