import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/reservations/StatusBadge";
import { useMonthlyRevenue, useStatusBreakdown, useFleetUsage } from "@/features/reports/hooks";
import { formatCurrency } from "@/lib/format";
import { DollarSign, ListChecks, Receipt } from "lucide-react";
import type { ReservationStatus } from "@/types/database.types";

export default function ReportsPage() {
  const { data: revenue } = useMonthlyRevenue(6);
  const { data: statusBreakdown } = useStatusBreakdown();
  const { data: fleetUsage } = useFleetUsage();

  const totalRevenue = revenue?.reduce((sum, p) => sum + p.total, 0) ?? 0;
  const totalServices = revenue?.reduce((sum, p) => sum + p.count, 0) ?? 0;
  const avgTicket = totalServices ? totalRevenue / totalServices : 0;

  const statuses: ReservationStatus[] = ["pending", "confirmed", "in_service", "completed", "cancelled"];

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Ingresos, ocupación y servicios de los últimos 6 meses." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="Ingresos (6 meses)" value={formatCurrency(totalRevenue)} tone="positive" />
        <StatCard icon={ListChecks} label="Servicios facturables" value={String(totalServices)} />
        <StatCard icon={Receipt} label="Ticket promedio" value={formatCurrency(avgTicket)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink-900">Ingresos por mes</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenue ?? []} margin={{ top: 16, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#E5E1D8" />
              <XAxis
                dataKey="month"
                tickFormatter={(v: string) => format(parse(v, "yyyy-MM", new Date()), "MMM", { locale: es })}
                tick={{ fill: "#6B6862", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                tick={{ fill: "#6B6862", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) =>
                  typeof label === "string" ? format(parse(label, "yyyy-MM", new Date()), "MMMM yyyy", { locale: es }) : String(label)
                }
                contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E1D8", borderRadius: 10, fontSize: 12 }}
              />
              <Bar dataKey="total" fill="#C9A227" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold text-ink-900">Reservaciones por estado</h2>
          <div className="mt-3 space-y-3">
            {statuses.map((s) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="font-mono-tab text-sm font-semibold text-ink-900">{statusBreakdown?.[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="font-display text-base font-semibold text-ink-900">Vehículos más utilizados</h2>
        <div className="mt-3 space-y-2">
          {fleetUsage && fleetUsage.length > 0 ? (
            fleetUsage.map((v) => (
              <div key={v.label} className="flex items-center justify-between border-b border-cream-200 py-2 text-sm last:border-0">
                <span className="text-ink-700">{v.label}</span>
                <span className="font-mono-tab font-semibold text-ink-900">{v.count} servicios</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">Sin datos suficientes todavía.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
