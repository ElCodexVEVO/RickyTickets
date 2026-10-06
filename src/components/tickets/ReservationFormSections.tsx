import { useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FieldWrapper, Input, Select, Textarea } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { FormSection, TextField, sectionIds } from "./FormSection";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { knownAirlines } from "@/lib/assets";
import { paymentSummary } from "@/lib/payments";
import { formatCurrency } from "@/lib/format";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type { ServiceCatalogItemRow } from "@/types/database.types";

const migrationHint = "Disponible al aplicar la migración 0008.";

// quickSupported: undefined mientras se comprueba la base; false sin 0008.
export function FlightSection({
  quickSupported,
}: {
  quickSupported?: boolean;
}) {
  const id = useId();
  const { control, setValue, getValues } =
    useFormContext<ReservationFormValues>();
  const [enabled, serviceType] = useWatch({
    control,
    name: ["include_flight", "service_type"],
  });
  return (
    <FormSection
      id={sectionIds.flight}
      step={3}
      title="Vuelo"
      aside={
        <Controller
          control={control}
          name="include_flight"
          render={({ field }) => (
            <Switch
              checked={field.value}
              label="Incluir información de vuelo"
              onChange={(checked) => {
                field.onChange(checked);
                // Propone la fecha de la ida; el operador puede cambiarla.
                if (checked && !getValues("flight_date") && getValues("date"))
                  setValue("flight_date", getValues("date"));
              }}
            />
          )}
        />
      }
    >
      {enabled ? (
        <div className="space-y-3">
          <datalist id={`${id}-airlines`}>
            {knownAirlines.map((a) => (
              <option key={a.iata} value={a.name}>
                {a.iata}
              </option>
            ))}
          </datalist>
          <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_minmax(150px,170px)]">
            <TextField
              name="airline"
              label="Aerolínea"
              list={`${id}-airlines`}
              placeholder="Volaris"
            />
            <TextField
              name="flight_number"
              label="Número de vuelo"
              placeholder="Y4 123"
            />
            <TextField name="flight_date" label="Fecha del vuelo" type="date" />
            <TextField
              name="flight_time"
              label="Hora"
              type="time"
              disabled={quickSupported !== true}
              hint={quickSupported === false ? migrationHint : undefined}
            />
          </div>
          {serviceType === "redondo" && (
            <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_minmax(150px,170px)]">
              <TextField
                name="return_airline"
                label="Aerolínea (regreso)"
                list={`${id}-airlines`}
              />
              <TextField name="return_flight_number" label="Vuelo de regreso" />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink-500">
          Opcional. Actívalo si el cliente llega o sale en avión; no es
          necesario para guardar.
        </p>
      )}
    </FormSection>
  );
}

export function HotelSection() {
  return (
    <FormSection
      id={sectionIds.hotel}
      step={4}
      title={
        <>
          Hotel
          <span className="text-xs font-normal text-ink-500">(opcional)</span>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-[minmax(0,1fr)_170px]">
        <TextField
          name="hotel"
          label="Nombre del hotel"
          placeholder="Hyatt Regency Tulum"
        />
        <TextField name="room" label="Habitación" placeholder="208" />
      </div>
    </FormSection>
  );
}

function AmountInput({
  id,
  name,
  disabled,
  invalid,
}: {
  id: string;
  name: "price" | "deposit";
  disabled?: boolean;
  invalid?: boolean;
}) {
  const { register } = useFormContext<ReservationFormValues>();
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
        $
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0.00"
        disabled={disabled}
        invalid={invalid}
        className="pl-7 font-mono-tab"
        {...register(name)}
      />
    </div>
  );
}

export function PaymentSection({
  payments,
  quickSupported,
}: {
  payments: ServiceCatalogItemRow[];
  quickSupported?: boolean;
}) {
  const id = useId();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  const [price, deposit, currency, method] = useWatch({
    control,
    name: ["price", "deposit", "currency", "payment_method"],
  });
  const summary = paymentSummary(price, deposit);
  const over =
    summary.total != null &&
    summary.deposit > summary.total &&
    summary.total > 0;
  return (
    <FormSection
      id={sectionIds.payment}
      step={5}
      title="Pago"
      aside={<PaymentStatusBadge status={summary.status} />}
    >
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1.15fr)_104px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <FieldWrapper
          label="Precio total"
          htmlFor={`${id}-price`}
          required
          error={errors.price?.message}
        >
          <AmountInput
            id={`${id}-price`}
            name="price"
            invalid={!!errors.price}
          />
        </FieldWrapper>
        <FieldWrapper label="Moneda" htmlFor={`${id}-currency`}>
          <Select id={`${id}-currency`} {...register("currency")}>
            <option>USD</option>
            <option>MXN</option>
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Método de pago" htmlFor={`${id}-method`}>
          <Select id={`${id}-method`} {...register("payment_method")}>
            <option value="">Sin definir</option>
            {method && !payments.some((p) => p.label === method) && (
              <option value={method}>{method}</option>
            )}
            {payments.map((p) => (
              <option key={p.id} value={p.label}>
                {p.label}
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper
          label="Anticipo"
          htmlFor={`${id}-deposit`}
          error={errors.deposit?.message}
          hint={
            quickSupported === false
              ? migrationHint
              : over
                ? "El anticipo supera el total; el restante queda en 0."
                : undefined
          }
        >
          <AmountInput
            id={`${id}-deposit`}
            name="deposit"
            disabled={quickSupported !== true}
            invalid={!!errors.deposit}
          />
        </FieldWrapper>
        <div className="flex flex-col gap-1.5">
          <span
            id={`${id}-remaining`}
            className="text-sm font-medium text-ink-700"
          >
            Restante
          </span>
          <output
            aria-labelledby={`${id}-remaining`}
            aria-live="polite"
            className="field-control flex items-center rounded-lg border border-line bg-carbon-900 px-3 font-mono-tab text-sm text-ink-900"
          >
            {summary.remaining == null
              ? "—"
              : `${formatCurrency(summary.remaining, currency)}`}
          </output>
          <span className="text-xs text-ink-500">Total − anticipo</span>
        </div>
      </div>
    </FormSection>
  );
}

export function NotesSection() {
  const id = useId();
  const { register } = useFormContext<ReservationFormValues>();
  return (
    <FormSection id={sectionIds.notes} step={6} title="Notas adicionales">
      <label htmlFor={id} className="sr-only">
        Notas adicionales
      </label>
      <Textarea
        id={id}
        placeholder="Indicaciones para el servicio, equipaje, sillas para niños… (opcional)"
        {...register("notes")}
      />
    </FormSection>
  );
}
