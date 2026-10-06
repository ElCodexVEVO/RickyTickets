import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Route, X } from "lucide-react";
import { operationDate } from "@/lib/operations";
import {
  filterOperationsServices,
  hasGeography,
  operationsServices,
  type MapFilters,
  type OperationsGeography,
} from "@/lib/operationsMap";
import type {
  DriverRow,
  ReservationWithRelations,
  VehicleRow,
} from "@/types/database.types";
import { OperationsMapFilters } from "./OperationsMapFilters";
import { OperationsMapCanvas } from "./OperationsMapCanvas";
import { ActiveServicesList } from "./ActiveServicesList";
import { ServiceMapCard } from "./ServiceMapCard";
import { MapEmptyState } from "./MapEmptyState";
import { QueryState } from "@/components/ui/QueryState";

export interface ServiceFocusRequest {
  legKey: string;
  sequence: number;
}
const noGeography: OperationsGeography = {};
export function OperationsMap({
  reservations,
  vehicles,
  drivers,
  focusRequest,
  geography = noGeography,
  loading = false,
  error,
  now: fixedNow,
}: {
  reservations: ReservationWithRelations[];
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  focusRequest?: ServiceFocusRequest;
  geography?: OperationsGeography;
  loading?: boolean;
  error?: unknown;
  now?: Date;
}) {
  const [clock, setClock] = useState(() => new Date());
  const now = fixedNow ?? clock;
  const titleId = useId();
  const surfaceId = useId();
  const [filters, setFilters] = useState<MapFilters>(() => ({
    state: "all",
    period: "today",
    date: operationDate(now),
  }));
  const [selectedKey, setSelectedKey] = useState<string>();
  const [highlightedKey, setHighlightedKey] = useState<string>();
  const [mapExpanded, setMapExpanded] = useState(false);
  const host = useRef<HTMLElement>(null);
  const services = useMemo(
    () => operationsServices(reservations, vehicles, drivers),
    [reservations, vehicles, drivers],
  );
  const focusedService = services.find((s) => s.key === focusRequest?.legKey);
  const focusDate = focusedService?.date;
  useEffect(() => {
    if (fixedNow) return;
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [fixedNow]);
  useEffect(() => {
    if (!focusRequest || !focusDate) return;
    setSelectedKey(focusRequest.legKey);
    setFilters({ state: "all", period: "day", date: focusDate });
    host.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [focusRequest, focusDate]);
  const displayed = filterOperationsServices(services, filters, now);
  const selected = displayed.find((s) => s.key === selectedKey);
  const located = displayed.filter((s) =>
    hasGeography(geography[s.key]),
  ).length;
  function changeFilters(value: MapFilters) {
    setFilters(value);
    setHighlightedKey(undefined);
  }
  const filterValue = {
    ...filters,
    date: filters.period === "day" ? filters.date : operationDate(now),
  };
  return (
    <section
      ref={host}
      className="operations-map-module"
      aria-labelledby={titleId}
    >
      <div className="operations-map-heading">
        <div>
          <h2 id={titleId}>
            <MapPin size={17} />
            Mapa de operaciones
          </h2>
          <p>Despacho de servicios · Quintana Roo</p>
        </div>
        <span className="operations-mode">
          <span />
          Vista operativa
        </span>
      </div>
      <OperationsMapFilters
        value={filterValue}
        onChange={changeFilters}
        now={now}
      />
      <div className="operations-map-summary" aria-live="polite">
        <span>
          <strong>{loading || error ? "—" : displayed.length}</strong>{" "}
          {displayed.length === 1 ? "servicio" : "servicios"}
          {filters.period === "next2h"
            ? " en las próximas 2 h"
            : ` · ${filters.period === "today" ? operationDate(now) : filters.date}`}
        </span>
        <span>
          {located} con ubicación
          {displayed.length > located
            ? ` · ${displayed.length - located} ${displayed.length - located === 1 ? "pendiente" : "pendientes"}`
            : ""}
        </span>
      </div>
      {filters.period === "next2h" && (
        <p className="operations-filter-note">
          Salidas con hora confirmada entre ahora y las próximas 2 h. Los
          regresos por determinar aparecen en Hoy.
        </p>
      )}
      <QueryState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <button
            type="button"
            className="operations-mobile-map-toggle"
            aria-expanded={mapExpanded}
            aria-controls={surfaceId}
            onClick={() => setMapExpanded(!mapExpanded)}
          >
            <MapPin size={14} />
            {mapExpanded ? "Ocultar mapa" : "Mostrar mapa"}
            <ChevronDown size={14} />
          </button>
          <div
            className={`operations-map-workspace ${mapExpanded ? "map-expanded" : ""}`}
          >
            <div id={surfaceId} className="operations-map-surface">
              <OperationsMapCanvas
                services={displayed}
                geography={geography}
                selectedKey={selected?.key}
                highlightedKey={highlightedKey}
                onSelect={setSelectedKey}
                enRoute={filters.state === "en_route"}
              />
              <div className="operations-map-legend">
                <span>
                  <i className="scheduled" />
                  Programado
                </span>
                <span>
                  <i className="unassigned" />
                  Por asignar
                </span>
                <span>
                  <i className="in-service" />
                  En servicio
                </span>
                <span>
                  <i className="conflict" />
                  Revisar
                </span>
                <span>
                  <i className="completed" />
                  Completado
                </span>
              </div>
            </div>
            <div className="operations-list-panel">
              <div className="operations-list-heading">
                <h3>Servicios{selected ? " · detalle" : ""}</h3>
                {selected && (
                  <button
                    type="button"
                    aria-label="Volver a la lista de servicios"
                    onClick={() => setSelectedKey(undefined)}
                  >
                    <X size={14} />
                    Volver
                  </button>
                )}
              </div>
              {selected ? (
                <ServiceMapCard
                  key={selected.key}
                  service={selected}
                  located={hasGeography(geography[selected.key])}
                />
              ) : displayed.length ? (
                <ActiveServicesList
                  services={displayed}
                  geography={geography}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  onHighlight={setHighlightedKey}
                />
              ) : (
                <div className="operations-list-empty">
                  <MapEmptyState empty enRoute={filters.state === "en_route"} />
                </div>
              )}
            </div>
          </div>
          <p className="operations-map-footer">
            <Route size={13} />
            Ruta y asignación de la reservación · Sin seguimiento en vivo
          </p>
        </>
      )}
    </section>
  );
}
