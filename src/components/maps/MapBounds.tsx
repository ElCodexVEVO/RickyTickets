import { useEffect } from "react";
import { latLngBounds } from "leaflet";
import { useMap } from "react-leaflet";
import type { GeoPoint } from "@/lib/operationsMap";
export function MapBounds({
  points,
  selectionKey,
}: {
  points: GeoPoint[];
  selectionKey?: string;
}) {
  const map = useMap();
  const key = points.map((p) => `${p.latitude},${p.longitude}`).join("|");
  useEffect(() => {
    if (!key) return;
    const positions = key
      .split("|")
      .map((p) => p.split(",").map(Number) as [number, number]);
    map.fitBounds(latLngBounds(positions), {
      padding: [35, 35],
      maxZoom: positions.length === 1 ? 15 : 14,
      animate: false,
    });
  }, [map, key, selectionKey]);
  return null;
}
