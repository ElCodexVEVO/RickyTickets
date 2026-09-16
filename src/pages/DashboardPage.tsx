import { CalendarCheck2, CarFront, DollarSign, ListTodo, Users2, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ReservationMiniList } from "@/components/dashboard/ReservationMiniList";
import {
  useDashboardStats,
  useUpcomingReservations,
  useRecentReservations,
  useRevenueTrend,
} from "@/features/dashboard/hooks";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { profile } = useAuth();
  const stats = useDashboardStats();
  const upcoming = useUpcomingReservations();
  const recent = useRecentReservations();
  const revenue = useRevenueTrend();

  const notConnected = stats.isError;

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile?.full_name?.split(" ")[0] ?? ""}`}
        subtitle="Resumen operativo de Danny Transfers."
        actions={
          <Link to="/ticket/nuevo">
            <Button>Crear Ticket</Button>
          </Link>
        }
      />

      {notConnected && (
        <div className="mb-6 rounded-xl border border-gold-500/40 bg-gold-300/10 px-4 py-3 text-sm text-gold-700">
          No se pudo conectar a Supabase todavía. Configura <code className="font-mono-tab">VITE_SUPABASE_URL</code> y{" "}
          <code className="font-mono-tab">VITE_SUPABASE_ANON_KEY</code> en <code className="font-mono-tab">.env.local</code> para ver datos reales.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={CalendarCheck2} label="Servicios hoy" value={String(stats.data?.todayServices ?? 0)} delayMs={0} />
        <StatCard icon={ListTodo} label="Reservas del mes" value={String(stats.data?.monthReservations ?? 0)} delayMs={40} />
        <StatCard icon={Users2} label="Clientes" value={String(stats.data?.totalCustomers ?? 0)} delayMs={80} />
        <StatCard
          icon={DollarSign}
          label="Ingresos del mes"
          value={formatCurrency(stats.data?.monthRevenue ?? 0)}
          tone="positive"
          delayMs={120}
        />
        <StatCard icon={CalendarClock} label="Pendientes" value={String(stats.data?.pendingServices ?? 0)} delayMs={160} />
        <StatCard
          icon={CarFront}
          label="Vehículos"
          value={`${stats.data?.vehiclesAvailable ?? 0} / ${stats.data?.vehiclesTotal ?? 0}`}
          hint="Disponibles"
          delayMs={200}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="animate-fade-in-up p-5 lg:col-span-2" style={{ animationDelay: "240ms" }}>
          <h2 className="font-display text-base font-semibold text-ink-900">Ingresos del mes</h2>
          <RevenueChart data={revenue.data ?? []} />
        </Card>

        <Card className="animate-fade-in-up p-5" style={{ animationDelay: "280ms" }}>
          <h2 className="font-display text-base font-semibold text-ink-900">Próximos servicios</h2>
          <div className="mt-2">
            <ReservationMiniList
              reservations={upcoming.data ?? []}
              emptyLabel="Sin servicios próximos"
            />
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card className="animate-fade-in-up p-5" style={{ animationDelay: "320ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-900">Reservaciones recientes</h2>
            <Link to="/reservaciones" className="text-sm font-medium text-gold-600 hover:text-gold-700">
              Ver todas
            </Link>
          </div>
          <div className="mt-2">
            <ReservationMiniList reservations={recent.data ?? []} emptyLabel="Aún no hay reservaciones" />
          </div>
        </Card>
      </div>
    </div>
  );
}
