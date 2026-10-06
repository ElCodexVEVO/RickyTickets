import { MapPin, AlertTriangle } from "lucide-react";
import {
  hasGeography,
  serviceMapState,
  type OperationsGeography,
  type OperationsService,
} from "@/lib/operationsMap";
export function ServiceStateBadge({ service }: { service: OperationsService }) {
  const state = serviceMapState(service);
  return (
    <span
      className="operations-status"
      style={{
        color: state.color,
        borderColor: `${state.color}50`,
        backgroundColor: `${state.color}12`,
      }}
    >
      <span style={{ backgroundColor: state.color }} />
      {state.label}
    </span>
  );
}
export function ActiveServicesList({
  services,
  selectedKey,
  onSelect,
  onHighlight,
  geography,
}: {
  services: OperationsService[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onHighlight: (key?: string) => void;
  geography: OperationsGeography;
}) {
  return (
    <div
      className="operations-service-list"
      role="group"
      aria-label="Lista de servicios"
    >
      {services.map((s) => (
        <button
          type="button"
          className="operations-service"
          key={s.key}
          aria-label={`${s.reservation.folio} · ${s.direction} · ${s.pickup} a ${s.dropoff}`}
          aria-pressed={selectedKey === s.key}
          onClick={() => onSelect(s.key)}
          onMouseEnter={() => onHighlight(s.key)}
          onMouseLeave={() => onHighlight()}
          onFocus={() => onHighlight(s.key)}
          onBlur={() => onHighlight()}
        >
          <div className="operations-service-top">
            <span className="operations-folio">{s.reservation.folio}</span>
            <span className="operations-time">
              {s.time?.slice(0, 5) ?? "Por determinar"}
            </span>
          </div>
          <p className="operations-service-route">
            {s.pickup} <span>→</span> {s.dropoff}
          </p>
          <p className="operations-service-team">
            <span
              className={!s.reservation.driver_id ? "operations-missing" : ""}
            >
              {s.reservation.driver?.full_name ??
                (s.reservation.driver_id
                  ? "Conductor asignado"
                  : "Sin conductor")}
            </span>
            <span> · </span>
            <span
              className={!s.reservation.vehicle_id ? "operations-missing" : ""}
            >
              {s.reservation.vehicle
                ? `${s.reservation.vehicle.model} · ${s.reservation.vehicle.plate}`
                : s.reservation.vehicle_id
                  ? "Vehículo asignado"
                  : "Sin vehículo"}
            </span>
          </p>
          <div className="operations-service-bottom">
            <ServiceStateBadge service={s} />
            <span className="operations-direction">{s.direction}</span>
            {s.warnings.length > 0 && (
              <AlertTriangle
                size={14}
                className="text-danger-500"
                aria-label="Revisar asignación"
              />
            )}
          </div>
          {!hasGeography(geography[s.key]) && (
            <span className="operations-location-pending">
              <MapPin size={12} />
              Ubicación pendiente
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
