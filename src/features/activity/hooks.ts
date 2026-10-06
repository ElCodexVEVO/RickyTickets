import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import type { ActivityLogRow } from "@/types/database.types";
export interface ActivityEntry extends ActivityLogRow {
  actor: { full_name: string } | null;
}
export function useActivity(entityId?: string, enabled = true) {
  return useQuery({
    queryKey: ["activity", entityId ?? "all"],
    enabled,
    queryFn: async (): Promise<ActivityEntry[]> => {
      let query = supabase
        .from("activity_logs")
        .select("*,actor:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (entityId) query = query.eq("entity_id", entityId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ActivityEntry[];
    },
    retry: 0,
  });
}
