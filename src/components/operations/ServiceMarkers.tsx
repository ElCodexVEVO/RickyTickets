import { useMemo } from "react";
import { divIcon } from "leaflet";
import { Marker, Tooltip, Polyline } from "react-leaflet";
import { serviceMapState, validGeoPoint, validRoute, type OperationsGeography, type OperationsService } from "@/lib/operationsMap";
export function servicePointIcon(kind: "origin" | "destination", color: string, selected = false) {
  const shape = kind === "origin" ? '<svg viewBox="0 0 28 34"><circle cx="14" cy="17" r="10" fill="currentColor"/><circle cx="14" cy="17" r="4" fill="#111517"/></svg>' : '<svg viewBox="0 0 28 34"><path d="M14 2C7.4 2 3 6.7 3 13c0 8 11 18 11 18s11-10 11-18C25 6.7 20.6 2 14 2Z" fill="currentColor"/><circle cx="14" cy="13" r="4" fill="#111517"/></svg>';
  return divIcon({ className: `service-map-marker ${selected ? "is-selected" : ""}`, html: `<span style="color:${color}" aria-hidden="true">${shape}</span>`, iconSize: [28, 34], iconAnchor: kind === "origin" ? [14, 17] : [14, 31], tooltipAnchor: [0, -17] });
}
function ServicePoints({ service, geography, selected, onSelect }: { service: OperationsService; geography: OperationsGeography[string]; selected: boolean; onSelect: (key: string) => void }) {
  const color = service.warnings.length ? "#f18181" : serviceMapState(service).color;
  const icons = useMemo(() => ({ origin: servicePointIcon("origin", color, selected), destination: servicePointIcon("destination", color, selected) }), [color, selected]);
  return <>
    {validRoute(geography.route) && <Polyline positions={geography.route.coordinates.map(([lng, lat]) => [lat, lng])} pathOptions={{ color, weight: selected ? 4 : 2, opacity: selected ? 1 : 0.45 }} />}
    {(["origin", "destination"] as const).map(kind => {
      const p = geography[kind]; if (!validGeoPoint(p)) return null;
      const label = `${kind === "origin" ? "Origen" : "Destino"} de ${service.reservation.folio} · ${service.direction}`;
      return <Marker key={kind} position={[p.latitude, p.longitude]} icon={icons[kind]} title={label} keyboard zIndexOffset={selected ? 1000 : 0} eventHandlers={{ click: () => onSelect(service.key) }}><Tooltip><strong>{service.reservation.folio}</strong><br />{kind === "origin" ? "Origen" : "Destino"} · {kind === "origin" ? service.pickup : service.dropoff}<br />{service.direction} · {service.time?.slice(0, 5) ?? "Por determinar"}</Tooltip></Marker>;
    })}
  </>;
}
export function ServiceMarkers({ services, geography, selectedKey, highlightedKey, onSelect }: { services: OperationsService[]; geography: OperationsGeography; selectedKey?: string; highlightedKey?: string; onSelect: (key: string) => void }) {
  return <>{services.map(s => geography[s.key] && <ServicePoints key={s.key} service={s} geography={geography[s.key]} selected={s.key === selectedKey || s.key === highlightedKey} onSelect={onSelect} />)}</>;
}
