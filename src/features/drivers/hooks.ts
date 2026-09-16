import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { DriverRow } from "@/types/database.types";
import { createDriver, updateDriver, deleteDriver, type DriverInput } from "@/features/drivers/api";

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: async (): Promise<DriverRow[]> => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .is("deleted_at", null)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    retry: 0,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDriver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DriverInput> }) => updateDriver(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}
