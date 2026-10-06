import { supabase } from "@/lib/supabaseClient";
import type { DriverRow, DriverStatus } from "@/types/database.types";

export interface DriverInput {
  full_name: string;
  phone: string | null;
  vehicle_id: string | null;
  status: DriverStatus;
  license_number: string | null;
  photo_url: string | null;
}

export async function createDriver(input: DriverInput): Promise<DriverRow> {
  const { data, error } = await supabase
    .from("drivers")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDriver(
  id: string,
  input: Partial<DriverInput>,
): Promise<DriverRow> {
  const { data, error } = await supabase
    .from("drivers")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
