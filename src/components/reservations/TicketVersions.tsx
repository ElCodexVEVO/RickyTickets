import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useReservationFiles } from "@/features/reservations/hooks";
import { QueryState } from "@/components/ui/QueryState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
export function TicketVersions({ id }: { id: string }) {
  const query = useReservationFiles(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function open(path: string) {
    setBusy(path);
    setError(null);
    const { data, error } = await supabase.storage
      .from("tickets")
      .createSignedUrl(path, 3600);
    setBusy(null);
    if (error || !data) {
      setError(error?.message ?? "No se pudo abrir la versión.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <div>
      <QueryState loading={query.isPending} error={query.error} />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="divide-y divide-line">
        {query.data?.map((f, index) => (
          <div
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div>
              <p className="text-sm">
                Ticket v{f.version}{" "}
                {index === 0 && <Badge tone="positive">Más reciente</Badge>}
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {formatDate(f.generated_at, "d MMM yyyy HH:mm")} ·{" "}
                {f.generator?.full_name ?? "Usuario registrado"}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              loading={busy === f.storage_path}
              onClick={() => void open(f.storage_path)}
            >
              Abrir versión
            </Button>
          </div>
        ))}
      </div>
      {query.data?.length === 0 && (
        <p className="text-sm text-ink-500">Sin PDFs guardados.</p>
      )}
      <p className="mt-3 text-[10px] text-ink-500">
        Las versiones conservan los datos de su generación. Regenera el PDF para
        incluir cambios posteriores.
      </p>
    </div>
  );
}
