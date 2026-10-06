import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono-tab text-sm text-gold-600">404</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
        Página no encontrada
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        La ruta que buscas no existe o fue movida.
      </p>
      <Link to="/" className="mt-6">
        <Button>Volver al dashboard</Button>
      </Link>
    </div>
  );
}
