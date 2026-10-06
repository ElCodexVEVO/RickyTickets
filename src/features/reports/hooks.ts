import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { format, startOfMonth, subMonths } from "date-fns";
import type { ReservationStatus } from "@/types/database.types";

export interface MonthlyRevenuePoint {
  month: string;
  total: number;
  count: number;
}

export function useMonthlyRevenue(monthsBack = 6) {
  return useQuery({
    queryKey: ["reports", "monthly-revenue", monthsBack],
    queryFn: async (): Promise<MonthlyRevenuePoint[]> => {
      const start = format(
        startOfMonth(subMonths(new Date(), monthsBack - 1)),
        "yyyy-MM-dd",
      );
      const { data, error } = await supabase
        .from("reservations")
        .select("date, price, status")
        .is("deleted_at", null)
        .gte("date", start)
        .in("status", ["confirmed", "in_service", "completed"]);
      if (error) throw error;

      const buckets = new Map<string, { total: number; count: number }>();
      for (let i = monthsBack - 1; i >= 0; i--) {
        const key = format(startOfMonth(subMonths(new Date(), i)), "yyyy-MM");
        buckets.set(key, { total: 0, count: 0 });
      }
      for (const row of data ?? []) {
        const key = (row.date as string).slice(0, 7);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.total += row.price ?? 0;
          bucket.count += 1;
        }
      }
      return Array.from(buckets.entries()).map(([month, v]) => ({
        month,
        ...v,
      }));
    },
    retry: 0,
  });
}

export function useStatusBreakdown() {
  return useQuery({
    queryKey: ["reports", "status-breakdown"],
    queryFn: async (): Promise<Record<ReservationStatus, number>> => {
      const { data, error } = await supabase
        .from("reservations")
        .select("status")
        .is("deleted_at", null);
      if (error) throw error;
      const result: Record<ReservationStatus, number> = {
        draft: 0,
        pending: 0,
        confirmed: 0,
        in_service: 0,
        completed: 0,
        cancelled: 0,
      };
      for (const row of data ?? []) {
        result[row.status as ReservationStatus] += 1;
      }
      return result;
    },
    retry: 0,
  });
}
