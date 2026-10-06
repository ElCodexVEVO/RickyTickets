import { supabase } from "@/lib/supabaseClient";
import type { ReservationStatus, ServiceType } from "@/types/database.types";

export interface PublicTicket {
  folio: string;
  customer_name: string;
  pickup_point: string;
  dropoff_point: string;
  hotel: string | null;
  room: string | null;
  passengers: number;
  date: string;
  time: string;
  status: ReservationStatus;
  service_type: ServiceType;
  return_date: string | null;
  return_time: string | null;
  return_pickup_point: string | null;
  return_dropoff_point: string | null;
}

export async function getPublicTicket(
  reservationId: string,
): Promise<PublicTicket | null> {
  const { data, error } = await supabase.rpc("get_public_ticket", {
    reservation_id: reservationId,
  });
  if (error) throw error;
  const rows = (data ?? []) as PublicTicket[];
  return rows[0] ?? null;
}
