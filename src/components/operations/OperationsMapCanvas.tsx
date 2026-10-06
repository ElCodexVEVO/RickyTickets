import { useId, useMemo } from "react";
import {
  hasGeography,
  serviceMapState,
  validGeoPoint,
  validRoute,
  type GeoPoint,
  type OperationsGeography,
  type OperationsService,
} from "@/lib/operationsMap";
import { MapEmptyState } from "./MapEmptyState";

export function OperationsMapCanvas({
  services,
  geography,
  selectedKey,
  highlightedKey,
  onSelect,
  enRoute,
}: {
  services: OperationsService[];
  geography: OperationsGeography;
  selectedKey?: string;
  highlightedKey?: string;
  onSelect: (key: string) => void;
  enRoute: boolean;
}) {
  const gridId = useId().replace(/:/g, "");
  const located = services.filter((s) => hasGeography(geography[s.key]));
  const projection = useMemo(() => {
    const points: GeoPoint[] = [];
    services.forEach((s) => {
      const g = geography[s.key];
      if (validGeoPoint(g?.origin)) points.push(g.origin);
      if (validGeoPoint(g?.destination)) points.push(g.destination);
      if (validRoute(g?.route))
        g.route.coordinates.forEach(([longitude, latitude]) =>
          points.push({ latitude, longitude }),
        );
    });
    if (!points.length) return undefined;
    const minLat = Math.min(...points.map((p) => p.latitude));
    const maxLat = Math.max(...points.map((p) => p.latitude));
    const minLng = Math.min(...points.map((p) => p.longitude));
    const maxLng = Math.max(...points.map((p) => p.longitude));
    const longitudeScale = Math.max(
      0.01,
      Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180),
    );
    const scale = Math.min(
      580 / Math.max((maxLng - minLng) * longitudeScale, 0.01),
      190 / Math.max(maxLat - minLat, 0.01),
    );
    return (p: GeoPoint) => ({
      x: 320 + (p.longitude - (minLng + maxLng) / 2) * longitudeScale * scale,
      y: 120 - (p.latitude - (minLat + maxLat) / 2) * scale,
    });
  }, [services, geography]);
  if (!projection)
    return <MapEmptyState empty={!services.length} enRoute={enRoute} />;
  return (
    <div className="operations-geographic-view">
      <svg
        viewBox="0 0 640 240"
        role="group"
        aria-label="Puntos geográficos de los servicios"
      >
        <defs>
          <pattern
            id={gridId}
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 0 0 0 32"
              fill="none"
              stroke="#34464b"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="640" height="240" fill={`url(#${gridId})`} />
        <text x="612" y="24" fill="#94a2ab" fontSize="11">
          N ↑
        </text>
        {located.map((s) => {
          const g = geography[s.key];
          const active = s.key === selectedKey || s.key === highlightedKey;
          const color = serviceMapState(s).color;
          return (
            <g key={s.key} data-highlighted={active}>
              {validRoute(g.route) && (
                <polyline
                  aria-label={`Ruta verificada de ${s.reservation.folio} · ${s.direction}`}
                  points={g.route.coordinates
                    .map(([longitude, latitude]) => {
                      const p = projection({ longitude, latitude });
                      return `${p.x},${p.y}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={active ? 4 : 2}
                  opacity={active ? 1 : 0.45}
                />
              )}
              {(["origin", "destination"] as const).map((kind) => {
                const point = g[kind];
                if (!validGeoPoint(point)) return null;
                const p = projection(point);
                return (
                  <g
                    key={kind}
                    role="button"
                    tabIndex={0}
                    aria-label={`${kind === "origin" ? "Origen" : "Destino"} de ${s.reservation.folio} · ${s.direction}`}
                    aria-pressed={selectedKey === s.key}
                    onClick={() => onSelect(s.key)}
                    onKeyDown={(e) => {
                      if (["Enter", " "].includes(e.key)) {
                        e.preventDefault();
                        onSelect(s.key);
                      }
                    }}
                    className="operations-marker"
                    transform={`translate(${p.x},${p.y})`}
                  >
                    <title>
                      {s.reservation.folio} ·{" "}
                      {kind === "origin" ? s.pickup : s.dropoff}
                    </title>
                    <circle
                      r={active ? 15 : 12}
                      fill={color}
                      opacity={active ? 0.25 : 0.12}
                    />
                    <circle
                      r={active ? 7 : 5}
                      fill={kind === "origin" ? color : "#111517"}
                      stroke={color}
                      strokeWidth="2"
                    />
                    <text
                      x="11"
                      y="-10"
                      fill={color}
                      fontSize="10"
                      paintOrder="stroke"
                      stroke="#111517"
                      strokeWidth="3"
                    >
                      {s.reservation.folio}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <p>
        Puntos confirmados · {located.length} servicios con ubicación · Sin
        seguimiento en vivo
      </p>
    </div>
  );
}
