import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { returnTimeLabel } from "@/lib/operations";
import { useCompanySettings } from "@/features/settings/hooks";
import type { ReservationWithRelations } from "@/types/database.types";
export function WhatsAppTemplates({
  reservation: r,
}: {
  reservation: ReservationWithRelations;
}) {
  const [template, setTemplate] = useState("Confirmación");
  const [custom, setCustom] = useState<string | null>(null);
  const settings = useCompanySettings();
  const ticket = `${window.location.origin}/verificar/${r.id}`;
  const route = `${r.pickup_point} → ${r.dropoff_point}`;
  const messages: Record<string, string> = {
    Confirmación: `Hola ${r.customer?.full_name ?? ""}, tu reservación ${r.folio} de Danny Transfers está ${r.status === "confirmed" ? "confirmada" : "registrada"}. ${route}. ${r.date} a las ${r.time.slice(0, 5)}.${r.service_type === "redondo" ? ` Regreso: ${r.return_date}, ${returnTimeLabel(r.return_time)}.` : ""}`,
    Recordatorio: `Recordatorio de tu servicio Danny Transfers ${r.folio}: ${route}, ${r.date} a las ${r.time.slice(0, 5)}.`,
    "Conductor en camino": `Hola, tu conductor de Danny Transfers va en camino para tu servicio ${r.folio}.`,
    "Conductor llegó": `Hola, el conductor de tu servicio ${r.folio} ha llegado al punto de recogida: ${r.pickup_point}.`,
    "Cambio de horario": `Actualización de Danny Transfers ${r.folio}: salida ${r.date} a las ${r.time.slice(0, 5)}.${r.service_type === "redondo" ? ` Regreso ${r.return_date}: ${returnTimeLabel(r.return_time)}.` : ""}`,
    Ticket: `Tu ticket Danny Transfers ${r.folio}: ${ticket}`,
    "Meeting point": `Puntos de encuentro Danny Transfers:\nTulum Airport: ${settings.data?.meetingPoints.tulum_airport ?? ""}\nCancún Airport: ${settings.data?.meetingPoints.cancun_airport ?? ""}`,
  };
  const text = custom ?? messages[template];
  const phone = (r.customer?.phone ?? "").replace(/\D/g, "");
  return (
    <div className="space-y-3">
      <Select
        aria-label="Plantilla WhatsApp"
        value={template}
        onChange={(e) => {
          setTemplate(e.target.value);
          setCustom(null);
        }}
      >
        {Object.keys(messages).map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Select>
      <Textarea
        aria-label="Mensaje WhatsApp"
        value={text}
        onChange={(e) => setCustom(e.target.value)}
        className="h-32"
      />
      <p className="text-[10px] text-ink-500">
        Revisa el mensaje antes de abrir WhatsApp. Las plantillas de llegada y
        salida no verifican ubicación ni cambian el estado.
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Abrir en WhatsApp
      </Button>
    </div>
  );
}
