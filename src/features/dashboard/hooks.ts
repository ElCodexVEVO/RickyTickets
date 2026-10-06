import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { format, startOfMonth, startOfToday } from "date-fns";
import type {
  CurrencyCode,
  ReservationWithRelations,
} from "@/types/database.types";

const RESERVATION_RELATIONS_SELECT = `
  *,
  customer:customers ( id, full_name, phone, email ),
  vehicle:vehicles ( id, brand, model, plate ),
  driver:drivers ( id, full_name, phone )
`;

export interface DashboardStats {
  todayServices: number;
  monthReservations: number;
  totalCustomers: number;
  monthRevenue: number;
  pendingServices: number;
  vehiclesAvailable: number;
  vehiclesTotal: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const today = format(startOfToday(), "yyyy-MM-dd");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

      const [
        todayCount,
        monthReservations,
        customersCount,
        monthRevenue,
        pendingCount,
        vehicles,
      ] = await Promise.all([
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("date", today),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gte("date", monthStart),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null),
        supabase
          .from("reservations")
          .select("price")
          .is("deleted_at", null)
          .gte("date", monthStart)
          .in("status", ["confirmed", "in_service", "completed"]),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("status", "pending"),
        supabase.from("vehicles").select("id, status").is("deleted_at", null),
      ]);

      const revenueSum = (monthRevenue.data ?? []).reduce(
        (sum, row) => sum + (row.price ?? 0),
        0,
      );
      const vehiclesData = vehicles.data ?? [];

      return {
        todayServices: todayCount.count ?? 0,
        monthReservations: monthReservations.count ?? 0,
        totalCustomers: customersCount.count ?? 0,
        monthRevenue: revenueSum,
        pendingServices: pendingCount.count ?? 0,
        vehiclesAvailable: vehiclesData.filter((v) => v.status === "available")
          .length,
        vehiclesTotal: vehiclesData.length,
      };
    },
    retry: 0,
  });
}

export function useUpcomingReservations() {
  return useQuery({
    queryKey: ["dashboard-upcoming"],
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_RELATIONS_SELECT)
        .is("deleted_at", null)
        .gte("date", today)
        .in("status", ["pending", "confirmed"])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as ReservationWithRelations[];
    },
    retry: 0,
  });
}

export function useRecentReservations() {
  return useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const { data, error } = await supabase
        .from("reservations")
        .select(RESERVATION_RELATIONS_SELECT)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as ReservationWithRelations[];
    },
    retry: 0,
  });
}

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
