import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Pencil,
  MessageCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUpdateReservationStatus } from "@/features/reservations/hooks";
import { WhatsAppTemplates } from "@/components/reservations/WhatsAppTemplates";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import type { OperationsService } from "@/lib/operationsMap";
import type { ReservationStatus } from "@/types/database.types";
import { ServiceStateBadge } from "./ActiveServicesList";

function ServiceStatusDialog({
  service,
  onClose,
}: {
  service: OperationsService;
  onClose: () => void;
}) {
  const { canEditReservations } = useAuth();
  const update = useUpdateReservationStatus();
  const [status, setStatus] = useState(service.reservation.status);
  const [error, setError] = useState("");
  async function save() {
    if (
      !canEditReservations ||
      update.isPending ||
      status === service.reservation.status
    )
      return;
    try {
      await update.mutateAsync({ id: service.reservation.id, status });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo actualizar el estado. Intenta nuevamente.",
      );
    }
  }
  return (
    <Modal
      open
      title={`Cambiar estado · ${service.reservation.folio}`}
      onClose={() => {
        if (!update.isPending) onClose();
      }}
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={update.isPending}
            onClick={onClose}
          >
            Volver
          </Button>
          <Button
            size="sm"
            loading={update.isPending}
            disabled={
              !canEditReservations || status === service.reservation.status
            }
            onClick={() => void save()}
          >
            Aplicar cambio
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-700">
        El cambio se aplica a la reservación completa, incluidos sus trayectos
        de ida y regreso.
      </p>
      <label htmlFor="operations-new-status" className="mb-2 block text-sm">
        Nuevo estado
      </label>
      <select
        id="operations-new-status"
        className="field-control rounded-lg border border-line bg-carbon-950 px-3 text-sm"
        value={status}
        disabled={update.isPending || !canEditReservations}
        onChange={(e) => {
          setStatus(e.target.value as ReservationStatus);
          setError("");
        }}
      >
        <option value="pending">Pendiente</option>
        <option value="confirmed">Confirmado</option>
        <option value="in_service">En servicio</option>
        <option value="completed">Completado</option>
      </select>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-500">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function ServiceMapCard({
  service,
  located,
}: {
  service: OperationsService;
  located: boolean;
}) {
  const { canEditReservations } = useAuth();
  const [dialog, setDialog] = useState<"status" | "contact" | null>(null);
  const r = service.reservation;
  const facts = [
    ["Cliente", r.customer?.full_name ?? "Cliente sin ficha"],
    [
      "Fecha y hora",
      `${formatDate(service.date)} · ${service.time?.slice(0, 5) ?? "Por determinar"}`,
    ],
    ["Pasajeros", `${r.passengers} personas`],
    ["Vuelo", service.flight || "Sin vuelo registrado"],
    [
      "Hotel",
      [r.hotel, r.room && `Hab. ${r.room}`].filter(Boolean).join(" · ") ||
        "Sin hotel",
    ],
  ];
  return (
    <section
      className="operations-detail"
      aria-label={`Detalle del servicio ${r.folio} · ${service.direction}`}
    >
      <div className="operations-detail-heading">
        <div>
          <p className="operations-eyebrow">
            Servicio seleccionado · {service.direction}
          </p>
          <h3>{r.folio}</h3>
        </div>
        <ServiceStateBadge service={service} />
      </div>
      <div className="operations-route-detail">
        <div>
          <span className="operations-route-dot" />
          <div>
            <p>Origen</p>
            <strong>{service.pickup}</strong>
          </div>
        </div>
        <div>
          <span className="operations-route-dot destination" />
          <div>
            <p>Destino</p>
            <strong>{service.dropoff}</strong>
          </div>
        </div>
      </div>
      <dl className="operations-detail-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="operations-booking-status">
        <span>Estado de reservación</span>
        <StatusBadge status={r.status} />
      </div>
      {!located && (
        <p className="operations-location-pending">
          <MapPin size={13} />
          Ubicación pendiente
        </p>
      )}
      <div className="operations-detail-actions">
        <Link to={`/reservaciones/${r.id}`}>
          <ArrowUpRight size={14} />
          Ver reservación
        </Link>
        {canEditReservations && (
          <>
            <Link to={`/reservaciones/${r.id}/editar`}>
              <Pencil size={13} />
              Editar
            </Link>
            <button type="button" onClick={() => setDialog("status")}>
              <RefreshCw size={13} />
              Cambiar estado
            </button>
          </>
        )}
        {(r.customer?.phone ?? "").replace(/\D/g, "") && (
          <button type="button" onClick={() => setDialog("contact")}>
            <MessageCircle size={14} />
            Contactar cliente
          </button>
        )}
      </div>
      {dialog === "status" && canEditReservations && (
        <ServiceStatusDialog
          service={service}
          onClose={() => setDialog(null)}
        />
      )}
      <Modal
        open={dialog === "contact"}
        title={`Contactar cliente · ${r.folio}`}
        onClose={() => setDialog(null)}
      >
        {dialog === "contact" && <WhatsAppTemplates reservation={r} />}
      </Modal>
    </section>
  );
}
