import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  Download,
  Eye,
  FilePenLine,
  MessageCircle,
  Pencil,
  RefreshCw,
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
import { TicketPreview } from "@/components/tickets/TicketPreview";
import { PaymentStatusBadge } from "@/components/tickets/PaymentStatusBadge";
import {
  useReservation,
  useReservationStatusHistory,
  useUpdateReservationStatus,
  useSoftDeleteReservation,
  useTicketPdfUrl,
} from "@/features/reservations/hooks";
import { useCatalogs } from "@/features/settings/catalogs";
import { returnTimeLabel } from "@/lib/operations";
import { paymentSummary } from "@/lib/payments";
import { ticketDataFromReservation } from "@/pdf/buildTicketData";
import type { ReservationStatus } from "@/types/database.types";

export default function ReservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, canEditReservations, user } = useAuth();
  const query = useReservation(id);
  const history = useReservationStatusHistory(id);
  const catalogs = useCatalogs();
  const status = useUpdateReservationStatus();
  const remove = useSoftDeleteReservation();
  const pdf = useTicketPdfUrl();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const r = query.data;
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
  const draft = r.status === "draft";
  const editable = r.status !== "cancelled" && !r.deleted_at;
  const canEdit =
    editable && (canEditReservations || (draft && r.created_by === user?.id));
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
  const preview = ticketDataFromReservation(
    r,
    {
      full_name: r.customer?.full_name ?? "Cliente",
      phone: r.customer?.phone ?? null,
      email: r.customer?.email ?? null,
    },
    catalogs.data?.find((c) => c.id === r.service_catalog_item_id)?.label,
  );
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
            {canEdit && (
              <Link to={`/reservaciones/${r.id}/editar`}>
                <Button size="sm" variant={draft ? "primary" : "secondary"}>
                  {draft ? <FilePenLine size={14} /> : <Pencil size={14} />}
                  {draft ? "Continuar borrador" : "Editar"}
                </Button>
              </Link>
            )}
            {!draft && (
              <>
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
            )}
          </>
        }
      />
      <QueryState error={pdf.error || status.error || remove.error} />
      {r.amaya_code && (
        <p className="mb-4 rounded-lg border border-line p-3 text-sm text-ink-700">
          Reserva compartida con Amaya · {r.amaya_code}.
          {r.amaya_payment?.verified && (
            <>
              {" "}
              Pago verificado en Amaya: {r.amaya_payment.amount}{" "}
              {r.amaya_payment.currency} ({r.amaya_payment.status}).
            </>
          )}{" "}
          El anticipo de Ricky se registra por separado; cancelar no reembolsa
          el pago de Amaya.
        </p>
      )}
      {draft && (
        <p className="mb-4 rounded-lg border border-line bg-carbon-900 p-3 text-sm text-ink-700">
          Borrador sin ticket. Complétalo con «Guardar y generar PDF» para
          asignarle estado pendiente y generar el ticket con QR.
        </p>
      )}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TicketPreview data={preview} />
          {!draft && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">
                Versiones de ticket
              </h2>
              <TicketVersions id={r.id} />
            </Card>
          )}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Plantillas WhatsApp</h2>
            <WhatsAppTemplates reservation={r} />
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Resumen</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              {(
                [
                  ["Ruta", `${r.pickup_point} → ${r.dropoff_point}`],
                  [
                    "Regreso",
                    r.service_type === "redondo"
                      ? `${r.return_date ?? "Fecha por definir"} · ${returnTimeLabel(r.return_time)}`
                      : "Solo ida",
                  ],
                  ["Pasajeros", String(r.passengers)],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd className="mt-0.5 text-ink-900">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-ink-500">Pago</dt>
                <dd className="mt-1">
                  {r.deposit == null ? (
                    <span className="text-ink-500">
                      Sin registro de anticipo
                    </span>
                  ) : (
                    <PaymentStatusBadge
                      status={paymentSummary(r.price, r.deposit).status}
                    />
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          {!draft && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold">
                Estado del servicio
              </h2>
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
                    {
                      ["Pendiente", "Confirmado", "En servicio", "Completado"][
                        i
                      ]
                    }
                  </Button>
                ))}
              </div>
              <h3 className="mb-3 mt-5 text-xs font-semibold">
                Historial de estados
              </h3>
              <QueryState loading={history.isPending} error={history.error} />
              {history.data && <StatusTimeline history={history.data} />}
            </Card>
          )}
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
              {!draft && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pdf.isPending}
                  onClick={() => void handlePdf("view")}
                >
                  <RefreshCw size={14} />
                  Regenerar PDF
                </Button>
              )}
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
