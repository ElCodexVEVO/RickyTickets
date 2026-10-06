import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { FieldWrapper, Input, Select, Textarea } from "@/components/ui/Field";
import { CustomerAutocomplete } from "@/components/tickets/CustomerAutocomplete";
import { RoundTripFields } from "@/components/tickets/RoundTripFields";
import { VehicleDriverSelect } from "@/components/tickets/VehicleDriverSelect";
import {
  useCatalogs,
  useServiceCatalogSupport,
} from "@/features/settings/catalogs";
import { QueryState } from "@/components/ui/QueryState";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
export const ticketSteps = [
  "Cliente",
  "Servicio",
  "Vuelo",
  "Transporte",
  "Pago",
  "Confirmar",
];
export const stepFields: (keyof ReservationFormValues)[][] = [
  ["customer_full_name", "customer_phone", "customer_email", "passengers"],
  [
    "service_type",
    "service_catalog_item_id",
    "pickup_point",
    "dropoff_point",
    "date",
    "time",
    "return_date",
    "return_time",
    "return_pickup_point",
    "return_dropoff_point",
  ],
  [
    "airline",
    "flight_number",
    "flight_date",
    "return_airline",
    "return_flight_number",
  ],
  ["vehicle_id", "driver_id"],
  ["price", "currency", "payment_method"],
  ["notes"],
];
function TextField({
  name,
  label,
  type = "text",
  required = false,
  list,
}: {
  name: keyof ReservationFormValues;
  label: string;
  type?: string;
  required?: boolean;
  list?: string;
}) {
  const id = useId();
  const {
    register,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  return (
    <FieldWrapper
      label={label}
      htmlFor={id}
      required={required}
      error={errors[name]?.message}
    >
      <Input
        id={id}
        type={type}
        list={list}
        step={name === "price" ? "0.01" : undefined}
        min={name === "price" ? 0 : name === "passengers" ? 1 : undefined}
        {...register(
          name,
          type === "number" && name === "passengers"
            ? { valueAsNumber: true }
            : {},
        )}
      />
    </FieldWrapper>
  );
}
export function TicketForm({ step = 0 }: { step?: number }) {
  const id = useId();
  const { register, watch } = useFormContext<ReservationFormValues>();
  const catalog = useCatalogs();
  const support = useServiceCatalogSupport();
  const active = (catalog.data ?? []).filter((c) => c.active);
  const locations = active.filter((c) => c.kind === "location");
  const payments = active.filter((c) => c.kind === "payment_method");
  const services = active.filter((c) => c.kind === "service_type");
  const values = watch();
  return (
    <div className="space-y-5">
      <h2 className="border-b border-line pb-3 text-base font-semibold">
        {
          [
            "Datos del cliente",
            "Transporte y servicio",
            "Información del vuelo",
            "Conductor y vehículo",
            "Datos del pago",
            "Confirmar reservación",
          ][step]
        }
      </h2>
      <QueryState error={catalog.error} />
      <datalist id={`${id}-locations`}>
        {locations.map((l) => (
          <option key={l.id} value={l.label} />
        ))}
      </datalist>
      {step === 0 && (
        <div className="space-y-4">
          <CustomerAutocomplete />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="customer_email" label="Correo" type="email" />
            <TextField
              name="passengers"
              label="Pasajeros"
              type="number"
              required
            />
          </div>
          <p className="text-xs text-ink-500">
            Busca un cliente existente por nombre o introduce sus datos para
            darlo de alta al guardar.
          </p>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper
              label="Servicio del catálogo"
              htmlFor={`${id}-service`}
              hint={
                support.data
                  ? "Opcional"
                  : "El catálogo de servicios aún no está habilitado."
              }
            >
              <Select
                disabled={!support.data}
                id={`${id}-service`}
                {...register("service_catalog_item_id")}
              >
                <option value="">Sin especificar</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
            <FieldWrapper label="¿Incluye regreso?" htmlFor={`${id}-trip`}>
              <Select id={`${id}-trip`} {...register("service_type")}>
                <option value="sencillo">Solo ida</option>
                <option value="redondo">Ida y regreso</option>
              </Select>
            </FieldWrapper>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name="pickup_point"
              label="Punto de recogida"
              required
              list={`${id}-locations`}
            />
            <TextField
              name="dropoff_point"
              label="Destino"
              required
              list={`${id}-locations`}
            />
            <TextField name="date" label="Fecha de ida" type="date" required />
            <TextField name="time" label="Hora de ida" type="time" required />
            <TextField name="hotel" label="Hotel" />
            <TextField name="room" label="Habitación" />
          </div>
          {values.service_type === "redondo" && <RoundTripFields />}
        </div>
      )}
      {step === 2 && (
        <>
          <p className="text-xs text-ink-500">
            Datos opcionales. Los horarios y números de vuelo se registran
            manualmente.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="airline" label="Aerolínea" />
            <TextField name="flight_number" label="Número de vuelo" />
            <TextField name="flight_date" label="Fecha del vuelo" type="date" />
            {values.service_type === "redondo" && (
              <>
                <TextField name="return_airline" label="Aerolínea de regreso" />
                <TextField
                  name="return_flight_number"
                  label="Vuelo de regreso"
                />
              </>
            )}
          </div>
        </>
      )}
      {step === 3 && <VehicleDriverSelect />}
      {step === 4 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="price" label="Precio total" type="number" />
            <FieldWrapper label="Moneda" htmlFor={`${id}-currency`}>
              <Select id={`${id}-currency`} {...register("currency")}>
                <option>USD</option>
                <option>MXN</option>
              </Select>
            </FieldWrapper>
            <FieldWrapper label="Método de pago" htmlFor={`${id}-payment`}>
              <Select id={`${id}-payment`} {...register("payment_method")}>
                <option value="">Sin definir</option>
                {values.payment_method &&
                  !payments.some((p) => p.label === values.payment_method) && (
                    <option value={values.payment_method}>
                      {values.payment_method}
                    </option>
                  )}
                {payments.map((p) => (
                  <option key={p.id} value={p.label}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FieldWrapper>
          </div>
          <p className="rounded-lg border border-line p-3 text-xs text-ink-500">
            El precio y el método de pago se guardan en la reservación. El
            modelo actual no registra importes cobrados, anticipos ni
            reembolsos.
          </p>
        </>
      )}
      {step === 5 && (
        <>
          <p className="text-sm text-ink-700">
            Revisa el resumen antes de guardar. Se asignará el folio definitivo
            y se generará el PDF con su QR.
          </p>
          <FieldWrapper label="Notas adicionales" htmlFor={`${id}-notes`}>
            <Textarea id={`${id}-notes`} {...register("notes")} />
          </FieldWrapper>
        </>
      )}
    </div>
  );
}
