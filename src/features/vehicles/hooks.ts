import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { VehicleRow } from "@/types/database.types";
import { createVehicle, updateVehicle, deleteVehicle, type VehicleInput } from "@/features/vehicles/api";

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async (): Promise<VehicleRow[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .is("deleted_at", null)
        .order("brand", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    retry: 0,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<VehicleInput> }) => updateVehicle(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}
