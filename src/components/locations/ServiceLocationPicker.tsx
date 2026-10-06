import { useEffect, useRef, useState } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { MapFrame } from "@/components/maps/MapFrame";
import { servicePointIcon } from "@/components/operations/ServiceMarkers";
import { locationSearchEnabled, reverseLocation } from "@/features/locations/search";
import { validGeoPoint, type GeoPoint } from "@/lib/operationsMap";
const pickerIcon = servicePointIcon("destination", "#e1bd68", true);
function PickerMarker({ point, onChange }: { point?: GeoPoint; onChange: (point: GeoPoint) => void }) {
  useMapEvents({ click: e => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }) });
  return point && <Marker position={[point.latitude, point.longitude]} icon={pickerIcon} draggable title="Ubicación seleccionada; puedes mover el marcador" eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); onChange({ latitude: p.lat, longitude: p.lng }); } }} />;
}
export function ServiceLocationPicker({ label, name, point: initialPoint, address: initialAddress, onConfirm, onClose }: { label: string; name: string; point?: GeoPoint; address?: string | null; onConfirm: (value: { name: string; address: string; point: GeoPoint }) => void; onClose: () => void }) {
  const [point, setPoint] = useState(initialPoint);
  const [visibleName, setVisibleName] = useState(name);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reverse = useRef<AbortController>(undefined);
  useEffect(() => () => reverse.current?.abort(), []);
  function updatePoint(p: GeoPoint) { reverse.current?.abort(); setLoading(false); setPoint(p); setAddress(""); setError(""); }
  async function lookup() {
    if (!point) return;
    reverse.current?.abort(); const abort = new AbortController(); reverse.current = abort;
    setLoading(true); setError("");
    try { const result = await reverseLocation(point, abort.signal); if (!abort.signal.aborted) { if (result) { setAddress(result.address); if (!visibleName.trim()) setVisibleName(result.name); } else setError("Sin dirección disponible. Puedes conservar el nombre escrito."); } }
    catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo buscar la dirección."); }
    finally { if (!abort.signal.aborted) setLoading(false); }
  }
  return <Modal open title={`Seleccionar en mapa · ${label}`} width="max-w-2xl" onClose={onClose} footer={<><Button size="sm" variant="secondary" onClick={onClose}>Volver</Button><Button size="sm" disabled={!validGeoPoint(point) || !visibleName.trim() || loading} onClick={() => { if (point) onConfirm({ name: visibleName.trim(), address, point }); }}>Confirmar ubicación</Button></>}>
    <p className="mb-3 text-sm text-ink-700">Haz clic en el mapa o mueve el marcador. Confirma el nombre y la ubicación antes de guardar.</p>
    <MapFrame center={initialPoint ? [initialPoint.latitude, initialPoint.longitude] : undefined} zoom={initialPoint ? 15 : 9} className="location-picker-map"><PickerMarker point={point} onChange={updatePoint} /></MapFrame>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs text-ink-700">Latitud<input aria-label="Latitud seleccionada" type="number" step="any" value={point?.latitude ?? ""} className="field-control mt-1 rounded-lg border border-line bg-carbon-950 px-3 text-sm" onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) updatePoint({ latitude: n, longitude: point?.longitude ?? -87.15 }); }} /></label><label className="text-xs text-ink-700">Longitud<input aria-label="Longitud seleccionada" type="number" step="any" value={point?.longitude ?? ""} className="field-control mt-1 rounded-lg border border-line bg-carbon-950 px-3 text-sm" onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) updatePoint({ longitude: n, latitude: point?.latitude ?? 20.65 }); }} /></label></div>
    <label className="mt-3 block text-xs text-ink-700">Nombre visible<input aria-label="Nombre de la ubicación" value={visibleName} onChange={e => setVisibleName(e.target.value)} className="field-control mt-1 rounded-lg border border-line bg-carbon-950 px-3 text-sm" /></label>
    {point && <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-ink-500">{address || "Puedes conservar el nombre escrito manualmente."}</span>{locationSearchEnabled && <Button variant="secondary" size="sm" loading={loading} onClick={() => void lookup()}>Buscar dirección</Button>}</div>}
    {error && <p role="status" className="mt-3 text-xs text-pending-500">{error}</p>}
  </Modal>;
}
