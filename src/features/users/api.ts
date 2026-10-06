import { supabase } from "@/lib/supabaseClient";
import type { ProfileRow, UserRole } from "@/types/database.types";

export async function listProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateProfileAccess(
  id: string,
  patch: {
    role?: UserRole;
    active?: boolean;
    permissions?: Record<string, unknown>;
  },
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface CreateEmployeeInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export async function createEmployee(input: CreateEmployeeInput) {
  const { data, error } = await supabase.functions.invoke("create-employee", {
    body: input,
  });
  if (error) throw error;
  return data as { id: string };
}
