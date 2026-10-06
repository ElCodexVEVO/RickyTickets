import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Ban,
  Download,
  Eye,
  MessageCircle,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QueryState } from "@/components/ui/QueryState";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { StatusTimeline } from "@/components/reservations/StatusTimeline";
import { CancellationModal } from "@/components/reservations/CancellationModal";
import { TicketVersions } from "@/components/reservations/TicketVersions";
import { ActivityList } from "@/components/reservations/ActivityList";
import { WhatsAppTemplates } from "@/components/reservations/WhatsAppTemplates";
import {
  TicketForm,
  ticketSteps,
  stepFields,
} from "@/components/tickets/TicketForm";
import { TicketPreview } from "@/components/tickets/TicketPreview";
import {
  useReservation,
  useReservationStatusHistory,
  useUpdateReservationFields,
  useUpdateReservationStatus,
  useSoftDeleteReservation,
  useTicketPdfUrl,
} from "@/features/reservations/hooks";
import {
  reservationPayload,
  type ReservationEditableFields,
} from "@/features/reservations/api";
import {
  reservationFormDefaults,
  reservationEditSchema,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { useReservations } from "@/features/reservations/hooks";
import { assignmentWarnings, returnTimeLabel } from "@/lib/operations";
import { ticketDataFromForm } from "@/pdf/buildTicketData";
import type { ReservationStatus } from "@/types/database.types";
import { reservationLocationDefaults } from "@/lib/reservationLocations";
export default function ReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canEditReservations } = useAuth();
  const query = useReservation(id);
  const history = useReservationStatusHistory(id);
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const all = useReservations({});
  const update = useUpdateReservationFields(id ?? "");
  const status = useUpdateReservationStatus();
  const remove = useSoftDeleteReservation();
  const pdf = useTicketPdfUrl();
  const [step, setStep] = useState(1);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationEditSchema),
    defaultValues: reservationFormDefaults,
  });
  const r = query.data;
  useEffect(() => {
    if (!r) return;
    form.reset({
      ...reservationFormDefaults,
      ...reservationLocationDefaults(r),
      customer_full_name: r.customer?.full_name ?? "",
      customer_phone: r.customer?.phone ?? "",
      customer_email: r.customer?.email ?? "",
      service_type: r.service_type,
      service_catalog_item_id: r.service_catalog_item_id ?? "",
      passengers: r.passengers,
      pickup_point: r.pickup_point,
      dropoff_point: r.dropoff_point,
      hotel: r.hotel ?? "",
      room: r.room ?? "",
      date: r.date,
      time: r.time,
      airline: r.airline ?? "",
      flight_number: r.flight_number ?? "",
      flight_date: r.flight_date ?? "",
      return_date: r.return_date ?? "",
      return_time: r.return_time ?? "",
      return_time_pending: r.service_type === "redondo" && !r.return_time,
      return_pickup_point: r.return_pickup_point ?? "",
      return_dropoff_point: r.return_dropoff_point ?? "",
      return_airline: r.return_airline ?? "",
      return_flight_number: r.return_flight_number ?? "",
      price: r.price == null ? "" : String(r.price),
      currency: r.currency,
      payment_method: r.payment_method ?? "",
      notes: r.notes ?? "",
      driver_id: r.driver_id ?? "",
      vehicle_id: r.vehicle_id ?? "",
    });
  }, [r, form]);
  const values = form.watch();
  const warnings = assignmentWarnings(
    {
      ...values,
      id: r?.id,
      return_time: values.return_time_pending ? null : values.return_time,
    },
    all.data ?? [],
    vehicles.data ?? [],
    drivers.data ?? [],
  );
  if (query.isPending) return <QueryState loading />;
  if (!r)
    return (
      <div>
        <PageHeader title="Reservación no disponible" />
        <QueryState error={query.error} retry={() => void query.refetch()} />
        <Link to="/reservaciones" className="text-gold-300">
          Volver al listado
        </Link>
      </div>
    );
  const canEdit =
    canEditReservations && r.status !== "cancelled" && !r.deleted_at;
  async function save(data: ReservationFormValues) {
    if (!r) return;
    setMessage(null);
    const payload = reservationPayload(data);
    const patch = Object.fromEntries(
      Object.entries(payload).filter(
        ([key]) =>
          !key.startsWith("customer_") &&
          (key !== "service_catalog_item_id" || "service_catalog_item_id" in r),
      ),
    ) as Partial<ReservationEditableFields>;
    try {
      await update.mutateAsync(patch);
      setMessage(
        "Cambios guardados. Regenera el PDF para actualizar el ticket.",
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "No se pudieron guardar los cambios.",
      );
    }
  }
  async function handlePdf(action: "view" | "download" | "whatsapp") {
    if (!r) return;
    try {
      const url = await pdf.mutateAsync(r);
      if (action === "whatsapp")
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`Tu ticket Danny Transfers (${r.folio}): ${url}`)}`,
          "_blank",
          "noopener,noreferrer",
        );
      else if (action === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${r.folio}.pdf`;
        link.click();
      } else window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* Feedback in QueryState */
    }
  }
  const preview = {
    ...ticketDataFromForm(values),
    folio: r.folio,
    status: r.status,
    vehicleName: vehicles.data?.find((v) => v.id === values.vehicle_id)?.model,
    driverName: drivers.data?.find((d) => d.id === values.driver_id)?.full_name,
  };
  return (
    <div>
      <Link
        to="/reservaciones"
        className="mb-3 inline-flex items-center gap-2 text-xs text-ink-500"
      >
        <ArrowLeft size={14} />
        Reservaciones
      </Link>
      <PageHeader
        title={r.folio}
        subtitle={r.customer?.full_name ?? undefined}
        actions={
          <>
            <StatusBadge status={r.status} />
            <Button
              size="sm"
              variant="secondary"
              loading={pdf.isPending}
              onClick={() => void handlePdf("view")}
            >
              <Eye size={14} />
              Ver PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pdf.isPending}
              onClick={() => void handlePdf("download")}
            >
              <Download size={14} />
              Descargar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pdf.isPending}
              onClick={() => void handlePdf("whatsapp")}
            >
              <MessageCircle size={14} />
              Compartir
            </Button>
          </>
        }
      />
      <QueryState error={pdf.error || status.error || remove.error} />
      {message && (
        <p
          role="status"
          className={`mb-4 rounded-lg border border-line p-3 text-sm ${update.isError ? "text-danger-500" : "text-positive-700"}`}
        >
          {message}
        </p>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TicketPreview data={preview} />
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Versiones de ticket</h2>
            <TicketVersions id={r.id} />
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Plantillas WhatsApp</h2>
            <WhatsAppTemplates reservation={r} />
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap gap-1">
              {ticketSteps.slice(1).map((label, index) => (
                <Button
                  key={label}
                  size="sm"
                  variant={step === index + 1 ? "primary" : "secondary"}
                  onClick={() => setStep(index + 1)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <FormProvider {...form}>
              <form
                onSubmit={form.handleSubmit(save, (errors) => {
                  const first = Object.keys(
                    errors,
                  )[0] as keyof ReservationFormValues;
                  setStep(
                    Math.max(
                      1,
                      stepFields.findIndex((fields) => fields.includes(first)),
                    ),
                  );
                })}
              >
                <fieldset disabled={!canEdit || update.isPending}>
                  <TicketForm step={step} />
                </fieldset>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-xs text-ink-500">
                    {r.service_type === "redondo"
                      ? `Hora de regreso guardada: ${returnTimeLabel(r.return_time)}`
                      : "Solo ida"}
                  </p>
                  {canEdit && (
                    <Button type="submit" loading={update.isPending}>
                      <Save size={15} />
                      Guardar cambios
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
            {warnings.length > 0 && (
              <div className="mt-4 rounded-lg border border-gold-500/30 p-3">
                <p className="mb-2 text-xs text-pending-500">
                  Revisar asignaciones · proximidad de 120 minutos
                </p>
                {warnings.map((w) => (
                  <p key={w} className="mb-1 text-xs text-ink-500">
                    {w}
                  </p>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Estado del servicio</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "pending",
                  "confirmed",
                  "in_service",
                  "completed",
                ] as ReservationStatus[]
              ).map((s, i) => (
                <Button
                  key={s}
                  size="sm"
                  variant={r.status === s ? "primary" : "secondary"}
                  disabled={!canEdit || status.isPending}
                  onClick={() => status.mutate({ id: r.id, status: s })}
                >
                  {["Pendiente", "Confirmado", "En servicio", "Completado"][i]}
                </Button>
              ))}
            </div>
            <h3 className="mb-3 mt-5 text-xs font-semibold">
              Historial de estados
            </h3>
            <QueryState loading={history.isPending} error={history.error} />
            {history.data && <StatusTimeline history={history.data} />}
          </Card>
          {isAdmin && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Actividad de la reservación
              </h2>
              <ActivityList entityId={r.id} />
            </Card>
          )}
          {isAdmin && (
            <Card className="flex flex-wrap gap-2 p-4">
              {r.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban size={14} />
                  Cancelar reservación
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={14} />
                Ocultar reservación
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pdf.isPending}
                onClick={() => void handlePdf("view")}
              >
                <RefreshCw size={14} />
                Regenerar PDF
              </Button>
            </Card>
          )}
        </div>
      </div>
      <CancellationModal
        open={cancelOpen}
        id={r.id}
        folio={r.folio}
        onClose={() => setCancelOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={`Ocultar ${r.folio}`}
        description="Se ocultará del listado. Se conserva en la base de datos para recuperación administrativa."
        confirmLabel="Ocultar"
        danger
        loading={remove.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() =>
          remove.mutate(r.id, { onSuccess: () => navigate("/reservaciones") })
        }
      />
    </div>
  );
}
