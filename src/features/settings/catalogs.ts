import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type {
  CatalogKind,
  ServiceCatalogItemRow,
} from "@/types/database.types";
export function useCatalogs() {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: async (): Promise<ServiceCatalogItemRow[]> => {
      const { data, error } = await supabase
        .from("service_catalog_items")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    retry: 0,
  });
}
export function useServiceCatalogSupport() {
  return useQuery({
    queryKey: ["catalog-service-support"],
    queryFn: async () => {
      const { error } = await supabase
        .from("reservations")
        .select("service_catalog_item_id")
        .limit(1);
      if (error && ["42703", "PGRST204"].includes(error.code)) return false;
      if (error) throw error;
      return true;
    },
    retry: 0,
    staleTime: 60_000,
  });
}
export function useSaveCatalog() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      kind: CatalogKind;
      label: string;
      code: string | null;
      sort_order: number;
      active: boolean;
    }) => {
      const { id, ...fields } = input;
      const { error } = id
        ? await supabase
            .from("service_catalog_items")
            .update(fields)
            .eq("id", id)
        : await supabase.from("service_catalog_items").insert(fields);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["catalogs"] }),
  });
}
