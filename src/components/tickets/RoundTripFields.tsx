import { useId } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { FieldWrapper, Input } from "@/components/ui/Field";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { TextField } from "./FormSection";
import { statusIcons } from "@/lib/assets";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export function RoundTripFields({ locationList }: { locationList: string }) {
  const id = useId();
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  const [pending, date] = useWatch({
    control,
    name: ["return_time_pending", "date"],
  });

  return (
    <fieldset className="rounded-xl border border-gold-400 bg-gold-500/5 p-4 shadow-[0_0_0_2px_#d5ac5010]">
      <legend className="sr-only">Información de regreso</legend>
      <p
        aria-hidden="true"
        className="mb-3 text-xs font-semibold uppercase tracking-wide text-gold-700"
      >
        Información de regreso
      </p>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_minmax(150px,170px)]">
        <TextField
          name="return_pickup_point"
          label="Punto de recogida (regreso)"
          required
          list={locationList}
        />
        <TextField
          name="return_dropoff_point"
          label="Destino (regreso)"
          required
          list={locationList}
        />
        <TextField
          name="return_date"
          label="Fecha de regreso"
          type="date"
          required
          min={date || undefined}
        />
        <FieldWrapper
          label="Hora de regreso"
          htmlFor={`${id}-time`}
          required={!pending}
          error={errors.return_time?.message}
        >
          <Input
            id={`${id}-time`}
            type="time"
            disabled={pending}
            placeholder={pending ? "Por definir" : undefined}
            invalid={!!errors.return_time}
            {...register("return_time")}
          />
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gold-300">
            <input
              type="checkbox"
              className="accent-gold-500"
              {...register("return_time_pending", {
                onChange: (e) => {
                  // La hora pendiente se guarda como NULL: nunca 00:00 ni texto.
                  if (e.target.checked)
                    setValue("return_time", "", { shouldValidate: true });
                },
              })}
            />
            Por determinar
          </label>
        </FieldWrapper>
      </div>
      {pending && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
          <AssetIcon
            src={statusIcons.unknownTime}
            size={14}
            className="text-gold-400"
          />
          La hora de regreso se confirmará después. La fecha sigue siendo
          obligatoria.
        </p>
      )}
    </fieldset>
  );
}
