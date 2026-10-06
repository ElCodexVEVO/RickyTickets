import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { format, startOfMonth } from "date-fns";
import type { CurrencyCode } from "@/types/database.types";

export interface RevenuePoint {
  day: string;
  total: number;
}

export function useRevenueTrend(currency: CurrencyCode = "USD") {
  return useQuery({
    queryKey: ["dashboard-revenue-trend", currency],
    queryFn: async (): Promise<RevenuePoint[]> => {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("reservations")
        .select("date, price")
        .eq("currency", currency)
        .is("deleted_at", null)
        .gte("date", monthStart)
        .in("status", ["confirmed", "in_service", "completed"])
        .order("date", { ascending: true });
      if (error) throw error;

      const byDay = new Map<string, number>();
      for (const row of data ?? []) {
        const key = row.date as string;
        byDay.set(key, (byDay.get(key) ?? 0) + (row.price ?? 0));
      }
      return Array.from(byDay.entries()).map(([day, total]) => ({
        day,
        total,
      }));
    },
    retry: 0,
  });
}
