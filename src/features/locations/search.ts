import { validGeoPoint, type GeoPoint } from "@/lib/operationsMap";
export interface LocationResult extends GeoPoint {
  id: string;
  name: string;
  address: string;
}
export const regionCenter: [number, number] = [20.65, -87.15];
const configured = import.meta.env.VITE_PHOTON_URL?.trim();
export const photonUrl =
  configured ?? (import.meta.env.DEV ? "https://photon.komoot.io" : "");
export const locationSearchEnabled = !!photonUrl;
const cache = new Map<string, { expires: number; results: LocationResult[] }>();
let lastRequest = 0;
let requestTimes: number[] = [];
let requestQueue: Promise<void> = Promise.resolve();
export function parsePhotonResults(data: unknown): LocationResult[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("features" in data) ||
    !Array.isArray(data.features)
  )
    return [];
  return data.features
    .flatMap((feature: unknown, index: number) => {
      if (!feature || typeof feature !== "object") return [];
      const f = feature as {
        geometry?: { type?: string; coordinates?: unknown[] };
        properties?: Record<string, unknown>;
      };
      if (
        f.geometry?.type !== "Point" ||
        !Array.isArray(f.geometry.coordinates)
      )
        return [];
      const [longitude, latitude] = f.geometry.coordinates;
      if (
        typeof longitude !== "number" ||
        typeof latitude !== "number" ||
        !validGeoPoint({ latitude, longitude })
      )
        return [];
      const p = f.properties ?? {};
      const text = (key: string) =>
        typeof p[key] === "string" ? p[key].slice(0, 1000) : "";
      const street = [text("street"), text("housenumber")]
        .filter(Boolean)
        .join(" ");
      const address = [
        ...new Set(
          [
            street,
            text("district"),
            text("city"),
            text("state"),
            text("country"),
          ].filter(Boolean),
        ),
      ].join(", ");
      const name = text("name") || street || text("city") || address;
      if (!name) return [];
      return [
        {
          id: `${String(p.osm_type ?? "point")}-${String(p.osm_id ?? index)}-${longitude}-${latitude}`,
          name,
          address,
          latitude,
          longitude,
        },
      ];
    })
    .slice(0, 5);
}
async function limitedRequest(
  url: string,
  signal: AbortSignal,
): Promise<LocationResult[]> {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.results;
  // Shared by all input fields and reverse lookup: one request/second, max 12/minute.
  const slot = requestQueue.then(async () => {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    requestTimes = requestTimes.filter((t) => Date.now() - t < 60_000);
    if (requestTimes.length >= 12)
      throw new Error(
        "Espera un momento antes de seguir buscando. También puedes seleccionar en el mapa.",
      );
    const delay = Math.max(0, 1100 - (Date.now() - lastRequest));
    if (delay)
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(new DOMException("Cancelado", "AbortError"));
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort);
          resolve();
        }, delay);
        signal.addEventListener("abort", abort, { once: true });
      });
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError");
    lastRequest = Date.now();
    requestTimes.push(lastRequest);
  });
  requestQueue = slot.catch(() => {});
  await slot;
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "El buscador está ocupado. Intenta después o selecciona en el mapa."
        : "La búsqueda no está disponible. Conserva el nombre o selecciona en el mapa.",
    );
  const results = parsePhotonResults(await response.json());
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(url, { expires: Date.now() + 10 * 60_000, results });
  return results;
}
export async function searchLocations(query: string, signal: AbortSignal) {
  if (!photonUrl || query.trim().length < 3) return [];
  const url = new URL(
    `${photonUrl.replace(/\/$/, "")}/api/`,
    window.location.origin,
  );
  url.searchParams.set("q", query.trim().slice(0, 200));
  url.searchParams.set("limit", "5");
  url.searchParams.set("lat", String(regionCenter[0]));
  url.searchParams.set("lon", String(regionCenter[1]));
  url.searchParams.set("zoom", "9");
  return limitedRequest(url.toString(), signal);
}
export async function reverseLocation(point: GeoPoint, signal: AbortSignal) {
  if (!photonUrl) return undefined;
  const url = new URL(
    `${photonUrl.replace(/\/$/, "")}/reverse`,
    window.location.origin,
  );
  url.searchParams.set("lat", String(point.latitude));
  url.searchParams.set("lon", String(point.longitude));
  url.searchParams.set("limit", "1");
  return (await limitedRequest(url.toString(), signal))[0];
}
