import { useEffect, useState, type ReactNode } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { regionCenter } from "@/features/locations/search";
const tileUrl = import.meta.env.VITE_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attribution = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
function MapResize() {
  const map = useMap();
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
export function MapFrame({ children, center = regionCenter, zoom = 9, label = "Mapa de ubicaciones", className = "", interactive = true }: { children?: ReactNode; center?: LatLngExpression; zoom?: number; label?: string; className?: string; interactive?: boolean }) {
  const [tileError, setTileError] = useState(false);
  return <div role="group" aria-label={label} className={`real-map-frame ${className}`}>
    <MapContainer center={center} zoom={zoom} className="real-map" zoomControl={false} scrollWheelZoom={false} dragging={interactive} doubleClickZoom={interactive} touchZoom={interactive} keyboard={interactive} minZoom={3} maxZoom={19}>
      <TileLayer url={tileUrl} attribution={attribution} maxZoom={19} eventHandlers={{ tileerror: () => setTileError(true), load: () => setTileError(false) }} />
      {interactive && <ZoomControl position="bottomright" />}
      <MapResize />
      {children}
    </MapContainer>
    {tileError && <p className="map-load-warning" role="status">No se pudo cargar parte del mapa. La lista y las ubicaciones guardadas siguen disponibles.</p>}
  </div>;
}
