import { supabase } from "@/lib/supabaseClient";
import type {
  VehicleRow,
  VehicleStatus,
  VehicleType,
} from "@/types/database.types";

export interface VehicleInput {
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  type: VehicleType;
  status: VehicleStatus;
  photo_url: string | null;
}

export async function createVehicle(input: VehicleInput): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(
  id: string,
  input: Partial<VehicleInput>,
): Promise<VehicleRow> {
  const { data, error } = await supabase
    .from("vehicles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function uploadFleetPhoto(
  file: File,
  prefix: string,
): Promise<string> {
  const path = `${prefix}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("fleet-photos")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("fleet-photos").getPublicUrl(path);
  return data.publicUrl;
}
