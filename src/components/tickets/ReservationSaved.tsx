import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TicketPreview } from "@/components/tickets/TicketPreview";
import type { ReservationRow } from "@/types/database.types";
import type { TicketData } from "@/types/domain";

// Confirmación después de «Guardar y generar PDF» (alta o edición).
export function ReservationSaved({
  reservation,
  preview,
  pdfUrl,
  generating,
  pdfError,
  updated,
  onRetryPdf,
  onNew,
}: {
  reservation: ReservationRow;
  preview: TicketData;
  pdfUrl: string | null;
  generating: boolean;
  pdfError: string | null;
  updated: boolean;
  onRetryPdf: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg animate-fade-in-up py-10 text-center">
      <div className="mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-positive-50 text-positive-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">
        {updated ? "Reservación actualizada" : "Ticket creado"}
      </h1>
      <p className="mt-1 font-mono-tab text-sm text-ink-500">
        Folio {reservation.folio}
      </p>
      {generating && (
        <p role="status" className="mt-3 text-sm text-ink-500">
          Generando PDF…
        </p>
      )}
      {pdfError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-500"
        >
          <p>
            Reservación guardada. El PDF no se completó: {pdfError}. No vuelvas
            a crear la reservación.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={onRetryPdf}
          >
            Reintentar PDF
          </Button>
        </div>
      )}

      <Card className="mt-6 p-4 text-left">
        <TicketPreview data={preview} />
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          disabled={!pdfUrl || generating}
          onClick={() =>
            pdfUrl && window.open(pdfUrl, "_blank", "noopener,noreferrer")
          }
        >
          <Eye className="h-4 w-4" />
          Ver PDF
        </Button>
        <Button
          variant="secondary"
          disabled={!pdfUrl || generating}
          onClick={() => {
            if (!pdfUrl) return;
            const a = document.createElement("a");
            a.href = pdfUrl;
            a.download = `${reservation.folio}.pdf`;
            a.click();
          }}
        >
          <Download className="h-4 w-4" />
          Descargar
        </Button>
        <Button
          variant="secondary"
          disabled={!pdfUrl}
          onClick={() => {
            const text = encodeURIComponent(
              `Tu ticket de Danny Transfers (${reservation.folio}): ${pdfUrl}`,
            );
            window.open(
              `https://wa.me/?text=${text}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Compartir por WhatsApp
        </Button>
        <Link to={`/reservaciones/${reservation.id}`}>
          <Button>Ver reservación</Button>
        </Link>
      </div>

      <button
        onClick={onNew}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Crear otro ticket
      </button>
    </div>
  );
}
