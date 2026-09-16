import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { CustomerRow, ReservationWithRelations } from "@/types/database.types";

export function useCustomerSearch(query: string) {
  return useQuery({
    queryKey: ["customers", "search", query],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .is("deleted_at", null)
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .order("last_service_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.trim().length >= 2,
    retry: 0,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: async (): Promise<CustomerRow> => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    retry: 0,
  });
}

export function useCustomerReservations(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customers", "reservations", customerId],
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, customer:customers(id,full_name,phone,email), vehicle:vehicles(id,brand,model,plate), driver:drivers(id,full_name,phone)")
        .eq("customer_id", customerId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReservationWithRelations[];
    },
    enabled: !!customerId,
    retry: 0,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers", "all"],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: 0,
  });
}
