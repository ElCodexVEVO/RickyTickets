import { useEffect, useId, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { clsx } from "clsx";
import { FormSection, TextField, sectionIds } from "./FormSection";
import { RoundTripFields } from "./RoundTripFields";
import { ServiceIcon } from "./ServiceIcon";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type {
  ServiceCatalogItemRow,
  ServiceType,
} from "@/types/database.types";

const tripTypes: [ServiceType, string][] = [
  ["sencillo", "Solo ida"],
  ["redondo", "Ida y regreso"],
];

export function ServiceRouteSection({
  services,
  locations,
  catalogEnabled,
}: {
  services: ServiceCatalogItemRow[];
  locations: ServiceCatalogItemRow[];
  catalogEnabled: boolean;
}) {
  const id = useId();
  const locationList = `${id}-locations`;
  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitted },
  } = useFormContext<ReservationFormValues>();
  const [serviceId, serviceType, pickup, dropoff] = useWatch({
    control,
    name: [
      "service_catalog_item_id",
      "service_type",
      "pickup_point",
      "dropoff_point",
    ],
  });

  // El regreso invierte la ida por defecto (destino → recogida) mientras el
  // operador no escriba otro punto: un valor distinto al reflejo se respeta.
  const mirror = useRef({
    return_pickup_point: getValues("dropoff_point"),
    return_dropoff_point: getValues("pickup_point"),
  });
  useEffect(() => {
    if (serviceType !== "redondo") return;
    const sync = (
      field: "return_pickup_point" | "return_dropoff_point",
      value: string,
    ) => {
      const current = getValues(field) ?? "";
      if (
        (current === "" || current === mirror.current[field]) &&
        current !== value
      )
        setValue(field, value, {
          shouldDirty: true,
          shouldValidate: isSubmitted,
        });
      mirror.current[field] = value;
    };
    sync("return_pickup_point", dropoff ?? "");
    sync("return_dropoff_point", pickup ?? "");
  }, [serviceType, pickup, dropoff, getValues, setValue, isSubmitted]);

  return (
    <FormSection id={sectionIds.route} step={2} title="Servicio y ruta">
      <datalist id={locationList}>
        {locations.map((l) => (
          <option key={l.id} value={l.label} />
        ))}
      </datalist>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          <div className="w-full min-w-0 @3xl:w-auto @3xl:flex-1">
            <p
              id={`${id}-service`}
              className="mb-1.5 text-sm font-medium text-ink-700"
            >
              Tipo de servicio
            </p>
            <div
              role="group"
              aria-labelledby={`${id}-service`}
              className="flex flex-wrap gap-2"
            >
              {services.map((s) => {
                const active = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={active}
                    disabled={!catalogEnabled}
                    onClick={() =>
                      setValue("service_catalog_item_id", active ? "" : s.id, {
                        shouldDirty: true,
                      })
                    }
                    className={clsx(
                      "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-[13px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55",
                      active
                        ? "border-gold-400 bg-gold-500/20 text-cream-100"
                        : "border-line bg-carbon-900 text-ink-700 hover:bg-carbon-800 hover:text-cream-50",
                    )}
                  >
                    <ServiceIcon
                      item={s}
                      size={16}
                      className={active ? "text-gold-300" : "text-ink-500"}
                    />
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              {!catalogEnabled
                ? "El catálogo de servicios aún no está habilitado."
                : services.length
                  ? "Opcional. Vuelve a pulsar un servicio para quitarlo."
                  : "Agrega servicios en Configuración → Catálogos operativos."}
            </p>
          </div>
          <div>
            <p
              id={`${id}-trip`}
              className="mb-1.5 text-sm font-medium text-ink-700"
            >
              Tipo de viaje<span className="ml-0.5 text-gold-600">*</span>
            </p>
            <div
              role="radiogroup"
              aria-labelledby={`${id}-trip`}
              className="flex rounded-lg border border-line bg-carbon-900 p-1"
            >
              {tripTypes.map(([value, label]) => (
                <label
                  key={value}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-ink-500 transition-colors has-checked:bg-gold-500/20 has-checked:text-gold-300 has-focus-visible:outline-2 has-focus-visible:outline-gold-500"
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register("service_type")}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_minmax(150px,170px)]">
          <TextField
            name="pickup_point"
            label={
              serviceType === "redondo"
                ? "Punto de recogida (ida)"
                : "Punto de recogida"
            }
            required
            list={locationList}
            placeholder="Hotel, aeropuerto o dirección"
          />
          <TextField
            name="dropoff_point"
            label={serviceType === "redondo" ? "Destino (ida)" : "Destino"}
            required
            list={locationList}
            placeholder="Tulum Airport (TQO)"
          />
          <TextField name="date" label="Fecha de ida" type="date" required />
          <TextField name="time" label="Hora de ida" type="time" required />
        </div>
        {errors.origin_lat?.message && (
          <p role="alert" className="text-xs font-medium text-danger-500">
            {errors.origin_lat.message}
          </p>
        )}
        {serviceType === "redondo" && (
          <RoundTripFields locationList={locationList} />
        )}
      </div>
    </FormSection>
  );
}
