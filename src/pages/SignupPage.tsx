import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-carbon-950 p-6">
      <div className="max-w-md rounded-xl border border-carbon-700 bg-carbon-900 p-8 text-center text-cream-50">
        <ShieldCheck className="mx-auto mb-4 h-9 w-9 text-gold-400" />
        <h1 className="text-xl font-semibold">Acceso para el equipo</h1>
        <p className="mt-3 text-sm text-ink-300">
          Las cuentas de Danny Transfers las crea el administrador. Solicita tu
          acceso al responsable de operaciones.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-gold-400"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
