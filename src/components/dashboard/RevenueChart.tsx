import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import type { RevenuePoint } from "@/features/dashboard/hooks";
import { formatCurrency } from "@/lib/format";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-ink-500">
        Aún no hay ingresos registrados este mes.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C9A227" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E5E1D8" />
        <XAxis
          dataKey="day"
          tickFormatter={(value: string) => format(parseISO(value), "d")}
          tick={{ fill: "#6B6862", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`}
          tick={{ fill: "#6B6862", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(label) => (typeof label === "string" ? format(parseISO(label), "d MMM") : String(label))}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5E1D8",
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="total" stroke="#A9822E" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
