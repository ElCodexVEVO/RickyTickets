import { useId } from "react";
import { useFormContext } from "react-hook-form";
import { FieldWrapper, Select } from "@/components/ui/Field";
import { QueryState } from "@/components/ui/QueryState";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useReservations } from "@/features/reservations/hooks";
import { assignmentWarnings } from "@/lib/operations";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
export function VehicleDriverSelect() {
  const id = useId();
  const { register, watch } = useFormContext<ReservationFormValues>();
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const reservations = useReservations({});
  const values = watch();
  const warnings = assignmentWarnings(
    {
      ...values,
      return_time: values.return_time_pending ? null : values.return_time,
    },
    reservations.data ?? [],
    vehicles.data ?? [],
    drivers.data ?? [],
  );
  return (
    <div className="space-y-4">
      <QueryState
        loading={
          vehicles.isPending || drivers.isPending || reservations.isPending
        }
        error={vehicles.error || drivers.error || reservations.error}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldWrapper label="Vehículo" htmlFor={`${id}-vehicle`}>
          <Select id={`${id}-vehicle`} {...register("vehicle_id")}>
            <option value="">Sin asignar</option>
            {vehicles.data?.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} · {v.plate} · {v.capacity} pax
              </option>
            ))}
          </Select>
        </FieldWrapper>
        <FieldWrapper label="Conductor" htmlFor={`${id}-driver`}>
          <Select id={`${id}-driver`} {...register("driver_id")}>
            <option value="">Sin asignar</option>
            {drivers.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </Select>
        </FieldWrapper>
      </div>
      {warnings.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-gold-500/30 bg-pending-50 p-3"
        >
          <p className="text-xs font-semibold text-pending-500">
            Advertencias de asignación
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-700">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-ink-500">
            Ventana de proximidad: 120 minutos. Revisa el traslado real; estas
            advertencias no bloquean el guardado.
          </p>
        </div>
      )}
    </div>
  );
}
