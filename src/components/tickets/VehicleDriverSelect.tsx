import { useFormContext } from "react-hook-form";
import { FieldWrapper, Select } from "@/components/ui/Field";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export function VehicleDriverSelect() {
  const { register, watch } = useFormContext<ReservationFormValues>();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const selectedVehicleId = watch("vehicle_id");

  const filteredDrivers =
    selectedVehicleId && drivers?.some((d) => d.vehicle_id === selectedVehicleId)
      ? drivers.filter((d) => d.vehicle_id === selectedVehicleId)
      : drivers;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FieldWrapper label="Vehículo" htmlFor="vehicle_id">
        <Select id="vehicle_id" {...register("vehicle_id")}>
          <option value="">Sin asignar</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model} · {v.plate}
            </option>
          ))}
        </Select>
      </FieldWrapper>
      <FieldWrapper label="Conductor" htmlFor="driver_id">
        <Select id="driver_id" {...register("driver_id")}>
          <option value="">Sin asignar</option>
          {filteredDrivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </Select>
      </FieldWrapper>
    </div>
  );
}
