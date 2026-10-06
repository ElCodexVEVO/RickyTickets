import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Copy, Download, Eye, MessageCircle, Pencil } from "lucide-react";
import type { ReservationWithRelations } from "@/types/database.types";
import { useAuth } from "@/context/AuthContext";
import { useTicketPdfUrl } from "@/features/reservations/hooks";
import { CancellationModal } from "@/components/reservations/CancellationModal";

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-surface-800 hover:text-ink-900 disabled:opacity-40"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ReservationActions({
  reservation,
}: {
  reservation: ReservationWithRelations;
}) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const ticketPdf = useTicketPdfUrl();
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function handlePdf(action: "download" | "whatsapp" | "view") {
    try {
      const url = await ticketPdf.mutateAsync(reservation);
      if (action === "whatsapp") {
        const text = encodeURIComponent(
          `Tu ticket de Danny Transfers (${reservation.folio}): ${url}`,
        );
        window.open(`https://wa.me/?text=${text}`, "_blank");
      } else if (action === "download") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reservation.folio}.pdf`;
        a.click();
      } else {
        window.open(url, "_blank");
      }
    } catch {
      // el error se refleja via ticketPdf.isError si se necesita feedback visual
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconButton
        icon={Eye}
        label="Ver"
        onClick={() => navigate(`/reservaciones/${reservation.id}`)}
      />
      <IconButton
        icon={Pencil}
        label="Editar"
        onClick={() => navigate(`/reservaciones/${reservation.id}?edit=1`)}
      />
      <IconButton
        icon={Download}
        label="Descargar PDF"
        onClick={() => handlePdf("download")}
        disabled={ticketPdf.isPending}
      />
      <IconButton
        icon={MessageCircle}
        label="Compartir por WhatsApp"
        onClick={() => handlePdf("whatsapp")}
        disabled={ticketPdf.isPending}
      />
      <IconButton
        icon={Copy}
        label="Duplicar"
        onClick={() =>
          navigate("/ticket/nuevo", { state: { duplicateFrom: reservation } })
        }
      />
      {isAdmin && reservation.status !== "cancelled" && (
        <IconButton
          icon={Ban}
          label="Cancelar"
          onClick={() => setConfirmCancel(true)}
        />
      )}

      {ticketPdf.isError && (
        <span role="alert" className="text-xs text-danger-500">
          No se pudo generar PDF
        </span>
      )}
      <CancellationModal
        open={confirmCancel}
        id={reservation.id}
        folio={reservation.folio}
        onClose={() => setConfirmCancel(false)}
      />
    </div>
  );
}
