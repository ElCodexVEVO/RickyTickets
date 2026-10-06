import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { RevenuePoint } from "@/features/dashboard/hooks";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode } from "@/types/database.types";

export function RevenueChart({
  data,
  currency = "USD",
  height = 224,
}: {
  data: RevenuePoint[];
  currency?: CurrencyCode;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-500"
      >
        Sin importes de servicios para este mes.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C9A227" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#2b3032" />
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
          formatter={(value) => formatCurrency(Number(value), currency)}
          labelFormatter={(label) =>
            typeof label === "string"
              ? format(parseISO(label), "d MMM")
              : String(label)
          }
          contentStyle={{
            background: "#15191b",
            color: "#f5f2e9",
            border: "1px solid #2b3032",
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#A9822E"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
