import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import logoUrl from "@/assets/logo.png";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-carbon-950">
        <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
      </div>
    );
  }

  if (user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError("Correo o contraseña incorrectos.");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-carbon-950 px-4">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 -top-24 h-96 w-96 animate-float-slow rounded-full bg-gold-500/10 blur-3xl" />
        <div
          className="absolute -bottom-32 -right-16 h-96 w-96 animate-float-slow rounded-full bg-gold-500/10 blur-3xl"
          style={{ animationDelay: "-4s", animationDuration: "13s" }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoUrl} alt="Danny Transfers" className="h-20 w-20 rounded-full object-cover" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-cream-50">Danny Transfers</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-300">RickyTickets · Tulum México</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-carbon-800 bg-carbon-900 p-6 shadow-xl"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-cream-100">
              Correo
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@dannytransfers.com"
              className="border-carbon-700 bg-carbon-950 text-cream-50 placeholder:text-ink-500 focus:border-gold-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-cream-100">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="border-carbon-700 bg-carbon-950 text-cream-50 placeholder:text-ink-500 focus:border-gold-500"
            />
          </div>

          {error && <p className="text-sm font-medium text-gold-400">{error}</p>}

          <Button type="submit" loading={submitting} className="w-full">
            <LogIn className="h-4 w-4" />
            Iniciar sesión
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-500">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="font-medium text-gold-400 hover:text-gold-300">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
