// Tipos de la base de datos Supabase. Reflejan supabase/migrations/0001_init.sql.
// Cuando el proyecto real esté conectado, se pueden regenerar con:
//   supabase gen types typescript --project-id <ref> > src/types/database.types.ts

export type UserRole = "admin" | "employee";
export type ServiceType = "sencillo" | "redondo";
export type ReservationStatus =
  "pending" | "confirmed" | "in_service" | "completed" | "cancelled";
export type CurrencyCode = "USD" | "MXN";
export type VehicleType = "van" | "suv" | "sedan" | "sprinter";
export type VehicleStatus =
  "available" | "in_service" | "maintenance" | "inactive";
export type DriverStatus = "available" | "on_service" | "off_duty" | "inactive";
export type CatalogKind = "service_type" | "payment_method" | "location";

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  permissions: { can_edit_reservations?: boolean } & Record<string, unknown>;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  total_services: number;
  total_spent: number;
  last_service_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VehicleRow {
  id: string;
  brand: string;
  model: string;
  plate: string;
  capacity: number;
  type: VehicleType;
  status: VehicleStatus;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  vehicle_id: string | null;
  status: DriverStatus;
  photo_url: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ServiceCatalogItemRow {
  id: string;
  kind: CatalogKind;
  code: string | null;
  label: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ReservationLocationFields {
  origin_lat?: number | null;
  origin_lng?: number | null;
  origin_address?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_address?: string | null;
  return_origin_lat?: number | null;
  return_origin_lng?: number | null;
  return_origin_address?: string | null;
  return_destination_lat?: number | null;
  return_destination_lng?: number | null;
  return_destination_address?: string | null;
}
export interface ReservationRow extends ReservationLocationFields {
  id: string;
  folio: string;
  customer_id: string;
  service_type: ServiceType;
  service_catalog_item_id?: string | null;
  pickup_point: string;
  dropoff_point: string;
  hotel: string | null;
  room: string | null;
  date: string;
  time: string;
  airline: string | null;
  flight_number: string | null;
  flight_date: string | null;
  return_date: string | null;
  return_time: string | null;
  return_pickup_point: string | null;
  return_dropoff_point: string | null;
  return_airline: string | null;
  return_flight_number: string | null;
  passengers: number;
  price: number | null;
  currency: CurrencyCode;
  payment_method: string | null;
  notes: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  status: ReservationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReservationStatusHistoryRow {
  id: string;
  reservation_id: string;
  previous_status: ReservationStatus | null;
  new_status: ReservationStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
}

export interface TicketFileRow {
  id: string;
  reservation_id: string;
  storage_path: string;
  version: number;
  generated_by: string | null;
  generated_at: string;
}

export interface SettingsRow {
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

export interface ActivityLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Vista con joins usada por el listado de Reservaciones y el detalle.
export interface ReservationWithRelations extends ReservationRow {
  customer: Pick<CustomerRow, "id" | "full_name" | "phone" | "email"> | null;
  vehicle: Pick<VehicleRow, "id" | "brand" | "model" | "plate"> | null;
  driver: Pick<DriverRow, "id" | "full_name" | "phone"> | null;
}

type Tables<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  public: {
    Tables: {
      profiles: Tables<
        ProfileRow,
        Omit<ProfileRow, "created_at" | "updated_at">
      >;
      customers: Tables<
        CustomerRow,
        Partial<Omit<CustomerRow, "id" | "created_at" | "updated_at">> & {
          full_name: string;
        }
      >;
      vehicles: Tables<
        VehicleRow,
        Omit<VehicleRow, "id" | "created_at" | "updated_at" | "deleted_at">
      >;
      drivers: Tables<
        DriverRow,
        Omit<DriverRow, "id" | "created_at" | "updated_at" | "deleted_at">
      >;
      service_catalog_items: Tables<
        ServiceCatalogItemRow,
        Omit<ServiceCatalogItemRow, "id" | "created_at">
      >;
      reservations: Tables<
        ReservationRow,
        Partial<
          Omit<ReservationRow, "id" | "folio" | "created_at" | "updated_at">
        >
      >;
      reservation_status_history: Tables<
        ReservationStatusHistoryRow,
        Omit<ReservationStatusHistoryRow, "id" | "created_at">
      >;
      ticket_files: Tables<
        TicketFileRow,
        Omit<TicketFileRow, "id" | "generated_at">
      >;
      settings: Tables<SettingsRow, Omit<SettingsRow, "updated_at">>;
      activity_logs: Tables<
        ActivityLogRow,
        Omit<ActivityLogRow, "id" | "created_at">
      >;
    };
    Functions: {
      create_reservation: {
        Args: { payload: Record<string, unknown> };
        Returns: ReservationRow;
      };
      cancel_reservation: {
        Args: { _id: string; _note?: string | null };
        Returns: ReservationRow;
      };
      soft_delete_reservation: {
        Args: { _id: string };
        Returns: void;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      can_edit_reservations: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
