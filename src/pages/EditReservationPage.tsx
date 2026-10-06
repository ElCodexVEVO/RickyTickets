import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { ReservationEditor } from "@/components/tickets/ReservationEditor";
import { useReservation } from "@/features/reservations/hooks";
import { formValuesFromReservation } from "@/lib/reservationFormValues";

export default function EditReservationPage() {
  const { id } = useParams();
  const location = useLocation();
  const { canEditReservations, user } = useAuth();
  const query = useReservation(id);
  const notice = (location.state as { notice?: string } | null)?.notice;
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

  const back = (
    <Link
      to={`/reservaciones/${r.id}`}
      className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900"
    >
      <ArrowLeft size={14} />
      Ver detalle
    </Link>
  );
  if (r.status === "cancelled" || r.deleted_at)
    return (
      <div>
        <PageHeader title={r.folio} actions={back} />
        <p className="rounded-lg border border-line p-4 text-sm text-ink-500">
          Esta reservación está cancelada u oculta y ya no puede editarse.
        </p>
      </div>
    );

  // Quien creó un borrador puede continuarlo aunque no tenga permiso general de edición.
  const canEdit =
    canEditReservations || (r.status === "draft" && r.created_by === user?.id);

  return (
    <ReservationEditor
      key={r.id}
      reservation={r}
      defaultValues={formValuesFromReservation(r)}
      canEdit={canEdit}
      notice={notice}
      headerActions={back}
    />
  );
}
