import { useFormContext } from "react-hook-form";
import { FieldWrapper, Input } from "@/components/ui/Field";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export function RoundTripFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();

  return (
    <div className="rounded-xl border border-gold-500/30 bg-gold-300/10 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-700">Información de regreso</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldWrapper label="Fecha de regreso" htmlFor="return_date" required error={errors.return_date?.message}>
          <Input id="return_date" type="date" {...register("return_date")} />
        </FieldWrapper>
        <FieldWrapper label="Hora de regreso" htmlFor="return_time" required error={errors.return_time?.message}>
          <Input id="return_time" type="time" {...register("return_time")} />
        </FieldWrapper>
        <FieldWrapper
          label="Punto de recogida (regreso)"
          htmlFor="return_pickup_point"
          required
          error={errors.return_pickup_point?.message}
        >
          <Input id="return_pickup_point" placeholder="Delek Tulum" {...register("return_pickup_point")} />
        </FieldWrapper>
        <FieldWrapper
          label="Destino (regreso)"
          htmlFor="return_dropoff_point"
          required
          error={errors.return_dropoff_point?.message}
        >
          <Input id="return_dropoff_point" placeholder="Tulum Airport (TQO)" {...register("return_dropoff_point")} />
        </FieldWrapper>
        <FieldWrapper label="Aerolínea de regreso" htmlFor="return_airline">
          <Input id="return_airline" placeholder="Viva Aerobus" {...register("return_airline")} />
        </FieldWrapper>
        <FieldWrapper label="Vuelo de regreso" htmlFor="return_flight_number">
          <Input id="return_flight_number" placeholder="VB7429" {...register("return_flight_number")} />
        </FieldWrapper>
      </div>
    </div>
  );
}
