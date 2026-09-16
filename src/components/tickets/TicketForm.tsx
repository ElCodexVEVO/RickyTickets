import { useFormContext } from "react-hook-form";
import { FieldWrapper, Input, Select, Textarea } from "@/components/ui/Field";
import { CustomerAutocomplete } from "@/components/tickets/CustomerAutocomplete";
import { RoundTripFields } from "@/components/tickets/RoundTripFields";
import { VehicleDriverSelect } from "@/components/tickets/VehicleDriverSelect";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-7 font-display text-sm font-semibold text-ink-900 first:mt-0">{children}</h3>;
}

export function TicketForm() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();

  const serviceType = watch("service_type");

  return (
    <div>
      <SectionTitle>Cliente</SectionTitle>
      <div className="space-y-4">
        <CustomerAutocomplete />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Email" htmlFor="customer_email" error={errors.customer_email?.message} hint="Opcional">
            <Input id="customer_email" type="email" placeholder="mia@ejemplo.com" {...register("customer_email")} />
          </FieldWrapper>
          <FieldWrapper label="Número de personas" htmlFor="passengers" required error={errors.passengers?.message}>
            <Input id="passengers" type="number" min={1} {...register("passengers", { valueAsNumber: true })} />
          </FieldWrapper>
        </div>
      </div>

      <SectionTitle>Servicio</SectionTitle>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Tipo" htmlFor="service_type" required>
            <Select id="service_type" {...register("service_type")}>
              <option value="sencillo">Sencillo</option>
              <option value="redondo">Redondo</option>
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Hotel" htmlFor="hotel" hint="Opcional">
            <Input id="hotel" placeholder="Delek Tulum" {...register("hotel")} />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldWrapper label="Punto de recogida" htmlFor="pickup_point" required error={errors.pickup_point?.message}>
            <Input id="pickup_point" placeholder="Tulum Airport (TQO)" {...register("pickup_point")} />
          </FieldWrapper>
          <FieldWrapper label="Destino" htmlFor="dropoff_point" required error={errors.dropoff_point?.message}>
            <Input id="dropoff_point" placeholder="Delek Tulum" {...register("dropoff_point")} />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="Habitación" htmlFor="room" hint="Opcional">
            <Input id="room" placeholder="204" {...register("room")} />
          </FieldWrapper>
          <FieldWrapper label="Fecha" htmlFor="date" required error={errors.date?.message}>
            <Input id="date" type="date" {...register("date")} />
          </FieldWrapper>
          <FieldWrapper label="Hora" htmlFor="time" required error={errors.time?.message}>
            <Input id="time" type="time" {...register("time")} />
          </FieldWrapper>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="Aerolínea" htmlFor="airline" hint="Opcional">
            <Input id="airline" placeholder="Volaris" {...register("airline")} />
          </FieldWrapper>
          <FieldWrapper label="Número de vuelo" htmlFor="flight_number" hint="Opcional">
            <Input id="flight_number" placeholder="Y41013" {...register("flight_number")} />
          </FieldWrapper>
          <FieldWrapper label="Fecha del vuelo" htmlFor="flight_date" hint="Opcional">
            <Input id="flight_date" type="date" {...register("flight_date")} />
          </FieldWrapper>
        </div>
      </div>

      {serviceType === "redondo" && (
        <div className="mt-5">
          <RoundTripFields />
        </div>
      )}

      <SectionTitle>Pago y logística</SectionTitle>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FieldWrapper label="Precio" htmlFor="price" error={errors.price?.message} hint="Opcional">
            <Input id="price" type="number" step="0.01" min={0} placeholder="120.00" {...register("price")} />
          </FieldWrapper>
          <FieldWrapper label="Moneda" htmlFor="currency">
            <Select id="currency" {...register("currency")}>
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
            </Select>
          </FieldWrapper>
          <FieldWrapper label="Método de pago" htmlFor="payment_method" hint="Opcional">
            <Select id="payment_method" {...register("payment_method")}>
              <option value="">Sin definir</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </Select>
          </FieldWrapper>
        </div>

        <VehicleDriverSelect />

        <FieldWrapper label="Notas adicionales" htmlFor="notes" hint="Opcional">
          <Textarea id="notes" placeholder="Instrucciones especiales, referencias, etc." {...register("notes")} />
        </FieldWrapper>
      </div>
    </div>
  );
}
