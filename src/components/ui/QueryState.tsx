import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: unknown;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div
        role="status"
        className="flex items-center gap-3 p-6 text-sm text-ink-500"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando datos…
      </div>
    );
  if (error)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-500"
      >
        <AlertTriangle className="h-5 w-5" />
        <span>
          No se pudieron cargar los datos. Comprueba tu conexión y tus permisos.
        </span>
        {retry && (
          <Button size="sm" variant="secondary" onClick={retry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  return null;
}
