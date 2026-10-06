import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { FieldWrapper, Input } from "@/components/ui/Field";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export function RoundTripFields() {
  const id = useId();
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  const pending = watch("return_time_pending");

  return (
    <div className="rounded-xl border border-gold-400 bg-gold-500/5 p-4 shadow-[0_0_0_2px_#d5ac5010]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-700">
        Información de regreso
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldWrapper
          label="Fecha de regreso"
          htmlFor={`${id}-return_date`}
          required
          error={errors.return_date?.message}
        >
          <Input
            id={`${id}-return_date`}
            type="date"
            {...register("return_date")}
          />
        </FieldWrapper>
        <FieldWrapper
          label="Hora de regreso"
          htmlFor={`${id}-return_time`}
          required={!pending}
          error={errors.return_time?.message}
          hint={
            pending ? "La hora de regreso se confirmará después." : undefined
          }
        >
          <Input
            id={`${id}-return_time`}
            type="time"
            disabled={pending}
            {...register("return_time")}
          />
          <label className="flex items-center gap-2 text-sm text-gold-300">
            <input
              type="checkbox"
              className="accent-gold-500"
              {...register("return_time_pending", {
                onChange: (e) => {
                  if (e.target.checked)
                    setValue("return_time", "", { shouldValidate: true });
                },
              })}
            />
            Por determinar
          </label>
        </FieldWrapper>
        <FieldWrapper
          label="Punto de recogida (regreso)"
          htmlFor={`${id}-return_pickup_point`}
          required
          error={errors.return_pickup_point?.message}
        >
          <Input
            id={`${id}-return_pickup_point`}
            placeholder="Delek Tulum"
            {...register("return_pickup_point")}
          />
        </FieldWrapper>
        <FieldWrapper
          label="Destino (regreso)"
          htmlFor={`${id}-return_dropoff_point`}
          required
          error={errors.return_dropoff_point?.message}
        >
          <Input
            id={`${id}-return_dropoff_point`}
            placeholder="Tulum Airport (TQO)"
            {...register("return_dropoff_point")}
          />
        </FieldWrapper>
      </div>
    </div>
  );
}
