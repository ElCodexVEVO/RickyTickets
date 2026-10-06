import { MapPin, Route } from "lucide-react";
export function MapEmptyState({
  empty = false,
  enRoute = false,
}: {
  empty?: boolean;
  enRoute?: boolean;
}) {
  return (
    <div className="operations-map-empty">
      <div className="operations-map-symbol">
        <MapPin size={25} />
        <span />
      </div>
      <h3>
        {empty
          ? "No hay servicios activos en este momento."
          : "Ubicación pendiente"}
      </h3>
      <p>
        {enRoute
          ? "El estado En camino aún no se registra. Consulta Por iniciar o En servicio."
          : empty
            ? "Ajusta los filtros o consulta otra fecha."
            : "Los servicios siguen disponibles en la lista. Sus puntos aparecerán al confirmar las ubicaciones."}
      </p>
      {!empty && (
        <span className="operations-map-caption">
          <Route size={14} /> Origen y destino en cada servicio
        </span>
      )}
    </div>
  );
}
