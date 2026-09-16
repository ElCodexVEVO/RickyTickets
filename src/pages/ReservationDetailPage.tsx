import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Download, Eye, MessageCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input, Select, Textarea } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { StatusTimeline } from "@/components/reservations/StatusTimeline";
import { TicketPreview } from "@/components/tickets/TicketPreview";
import { FullScreenLoader } from "@/components/ui/FullScreenLoader";
import {
  useReservation,
  useReservationStatusHistory,
  useUpdateReservationFields,
  useUpdateReservationStatus,
  useCancelReservation,
  useSoftDeleteReservation,
  useTicketPdfUrl,
} from "@/features/reservations/hooks";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useAuth } from "@/context/AuthContext";
import { ticketDataFromReservation } from "@/pdf/buildTicketData";
import type { ReservationStatus } from "@/types/database.types";

const NEXT_STATUSES: { value: ReservationStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "in_service", label: "En servicio" },
  { value: "completed", label: "Completado" },
];

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, canEditReservations } = useAuth();
  const { data: reservation, isLoading } = useReservation(id);
  const { data: history } = useReservationStatusHistory(id);
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  const updateFields = useUpdateReservationFields(id ?? "");
  const updateStatus = useUpdateReservationStatus();
  const cancelReservation = useCancelReservation();
  const softDelete = useSoftDeleteReservation();
  const ticketPdf = useTicketPdfUrl();

  const [form, setForm] = useState<Record<string, string>>({});
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    setForm({
      pickup_point: reservation.pickup_point ?? "",
      dropoff_point: reservation.dropoff_point ?? "",
      hotel: reservation.hotel ?? "",
      room: reservation.room ?? "",
      date: reservation.date ?? "",
      time: reservation.time ?? "",
      price: reservation.price != null ? String(reservation.price) : "",
      currency: reservation.currency,
      payment_method: reservation.payment_method ?? "",
      notes: reservation.notes ?? "",
      vehicle_id: reservation.vehicle_id ?? "",
      driver_id: reservation.driver_id ?? "",
    });
  }, [reservation]);

  if (isLoading) return <FullScreenLoader />;
  if (!reservation) {
    return (
      <div>
        <PageHeader title="Reservación no encontrada" />
        <Link to="/reservaciones" className="text-sm font-medium text-gold-600">
          Volver al listado
        </Link>
      </div>
    );
  }

  const canEdit = (isAdmin || canEditReservations) && reservation.status !== "cancelled";

  async function handlePdf(action: "download" | "whatsapp" | "view") {
    if (!reservation) return;
    const url = await ticketPdf.mutateAsync(reservation);
    if (action === "whatsapp") {
      const text = encodeURIComponent(`Tu ticket de Danny Transfers (${reservation.folio}): ${url}`);
      window.open(`https://wa.me/?text=${text}`, "_blank");
    } else if (action === "download") {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reservation.folio}.pdf`;
      a.click();
    } else {
      window.open(url, "_blank");
    }
  }

  function handleSave() {
    updateFields.mutate({
      pickup_point: form.pickup_point,
      dropoff_point: form.dropoff_point,
      hotel: form.hotel || null,
      room: form.room || null,
      date: form.date,
      time: form.time,
      price: form.price ? Number(form.price) : null,
      currency: form.currency as "USD" | "MXN",
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      vehicle_id: form.vehicle_id || null,
      driver_id: form.driver_id || null,
    });
  }

  return (
    <div>
      <Link to="/reservaciones" className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        Reservaciones
      </Link>

      <PageHeader
        title={reservation.folio}
        subtitle={reservation.customer?.full_name ?? undefined}
        actions={
          <>
            <StatusBadge status={reservation.status} />
            <Button variant="secondary" onClick={() => handlePdf("view")} loading={ticketPdf.isPending}>
              <Eye className="h-4 w-4" />
              Ver PDF
            </Button>
            <Button variant="secondary" onClick={() => handlePdf("download")}>
              <Download className="h-4 w-4" />
              Descargar
            </Button>
            <Button variant="secondary" onClick={() => handlePdf("whatsapp")}>
              <MessageCircle className="h-4 w-4" />
              Compartir
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <TicketPreview data={ticketDataFromReservation(reservation, {
          full_name: reservation.customer?.full_name ?? "Cliente",
          phone: reservation.customer?.phone ?? null,
          email: reservation.customer?.email ?? null,
        })} />

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-ink-900">Detalles del servicio</h2>
              {canEdit && (
                <Button size="sm" onClick={handleSave} loading={updateFields.isPending}>
                  <Save className="h-3.5 w-3.5" />
                  Guardar cambios
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldWrapper label="Punto de recogida" htmlFor="d_pickup">
                <Input id="d_pickup" disabled={!canEdit} value={form.pickup_point ?? ""} onChange={(e) => setForm({ ...form, pickup_point: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Destino" htmlFor="d_dropoff">
                <Input id="d_dropoff" disabled={!canEdit} value={form.dropoff_point ?? ""} onChange={(e) => setForm({ ...form, dropoff_point: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Hotel" htmlFor="d_hotel">
                <Input id="d_hotel" disabled={!canEdit} value={form.hotel ?? ""} onChange={(e) => setForm({ ...form, hotel: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Habitación" htmlFor="d_room">
                <Input id="d_room" disabled={!canEdit} value={form.room ?? ""} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Fecha" htmlFor="d_date">
                <Input id="d_date" type="date" disabled={!canEdit} value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Hora" htmlFor="d_time">
                <Input id="d_time" type="time" disabled={!canEdit} value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Precio" htmlFor="d_price">
                <Input id="d_price" type="number" step="0.01" disabled={!canEdit} value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </FieldWrapper>
              <FieldWrapper label="Moneda" htmlFor="d_currency">
                <Select id="d_currency" disabled={!canEdit} value={form.currency ?? "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                </Select>
              </FieldWrapper>
              <FieldWrapper label="Vehículo" htmlFor="d_vehicle">
                <Select id="d_vehicle" disabled={!canEdit} value={form.vehicle_id ?? ""} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {vehicles?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} · {v.plate}
                    </option>
                  ))}
                </Select>
              </FieldWrapper>
              <FieldWrapper label="Conductor" htmlFor="d_driver">
                <Select id="d_driver" disabled={!canEdit} value={form.driver_id ?? ""} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
                  <option value="">Sin asignar</option>
                  {drivers?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </Select>
              </FieldWrapper>
            </div>
            <div className="mt-4">
              <FieldWrapper label="Notas" htmlFor="d_notes">
                <Textarea id="d_notes" disabled={!canEdit} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </FieldWrapper>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-display text-base font-semibold text-ink-900">Estado del servicio</h2>
            <div className="flex flex-wrap items-center gap-2">
              {NEXT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  disabled={!canEdit || updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: reservation.id, status: s.value })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    reservation.status === s.value
                      ? "border-gold-500 bg-gold-500 text-carbon-950"
                      : "border-cream-200 text-ink-700 hover:bg-cream-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <h3 className="mb-3 mt-6 font-display text-sm font-semibold text-ink-900">Historial</h3>
            <StatusTimeline history={history ?? []} />
          </Card>

          {isAdmin && (
            <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-display text-sm font-semibold text-ink-900">Zona de administrador</p>
                <p className="text-xs text-ink-500">Cancelar o eliminar esta reservación.</p>
              </div>
              <div className="flex gap-2">
                {reservation.status !== "cancelled" && (
                  <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
                    <Ban className="h-4 w-4" />
                    Cancelar
                  </Button>
                )}
                <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
                <Button variant="secondary" onClick={() => handlePdf("view")}>
                  <RefreshCw className="h-4 w-4" />
                  Regenerar PDF
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancelar ${reservation.folio}`}
        description="Esta acción notificará el cambio de estado y queda en el historial."
        confirmLabel="Cancelar reservación"
        loading={cancelReservation.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => cancelReservation.mutate({ id: reservation.id }, { onSuccess: () => setConfirmCancel(false) })}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Eliminar ${reservation.folio}`}
        description="La reservación se ocultará del listado general. Esta acción solo puede revertirse desde la base de datos."
        confirmLabel="Eliminar"
        danger
        loading={softDelete.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => softDelete.mutate(reservation.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </div>
  );
}
