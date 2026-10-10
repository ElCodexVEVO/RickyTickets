import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReservation,
  cancelReservationRpc,
  softDeleteReservationRpc,
  updateReservationStatus,
  updateReservationFields,
  type ReservationEditableFields,
  listReservations,
  getReservation,
  getReservationStatusHistory,
  getReservationFiles,
  type ReservationFilters,
} from "@/features/reservations/api";
import type {
  ReservationRow,
  ReservationStatus,
  ReservationWithRelations,
} from "@/types/database.types";
import { useCompanySettings } from "@/features/settings/hooks";
import { useCatalogs } from "@/features/settings/catalogs";

function invalidateReservationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["reservations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-upcoming"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-recent"] });
  queryClient.invalidateQueries({ queryKey: ["customers"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
  queryClient.invalidateQueries({ queryKey: ["activity"] });
  queryClient.invalidateQueries({ queryKey: ["public-ticket"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-revenue-trend"] });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReservation,
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}

export function useReservations(filters: ReservationFilters, enabled = true) {
  return useQuery({
    queryKey: ["reservations", filters],
    queryFn: () => listReservations(filters),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled,
    retry: 0,
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "detail", id],
    queryFn: () => getReservation(id!),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: !!id,
    retry: 0,
  });
}

export function useReservationStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "history", id],
    queryFn: () => getReservationStatusHistory(id!),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: !!id,
    retry: 0,
  });
}

export function useReservationFiles(id: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "files", id],
    queryFn: () => getReservationFiles(id!),
    enabled: !!id,
    retry: 0,
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      cancelReservationRpc(id, note),
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}

export function useSoftDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteReservationRpc(id),
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}

export function useUpdateReservationFields(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ReservationEditableFields>) =>
      updateReservationFields(id, patch),
    onSuccess: () => {
      invalidateReservationQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: ["reservations", "detail", id],
      });
    },
  });
}

export interface TicketCustomer {
  full_name: string;
  phone: string | null;
  email: string | null;
}

// Genera y guarda una nueva versión del PDF. Siempre regenera: el PDF debe
// reflejar el estado y los datos actuales (precio, anticipo, estado), nunca una
// versión cacheada de cuando se creó el ticket.
export function useGenerateTicketPdf() {
  const settings = useCompanySettings();
  const catalogs = useCatalogs();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reservation,
      customer,
    }: {
      reservation: ReservationRow;
      customer: TicketCustomer;
    }) => {
      if (!settings.data || settings.isError || settings.isPlaceholderData)
        throw new Error(
          "Espera a que cargue la configuración de tickets antes de generar el PDF.",
        );
      if (reservation.status === "draft")
        throw new Error("Un borrador no genera ticket. Complétalo primero.");
      const { generateAndStoreTicketPdf } =
        await import("@/pdf/generateTicketPdf");
      const { signedUrl } = await generateAndStoreTicketPdf({
        reservation,
        customer,
        serviceLabel: catalogs.data?.find(
          (c) => c.id === reservation.service_catalog_item_id,
        )?.label,
        companyInfo: settings.data.companyInfo,
        meetingPoints: settings.data.meetingPoints,
        ticketTerms: settings.data.ticketTerms,
      });
      if (!signedUrl) throw new Error("No se pudo generar la URL del PDF");
      return signedUrl;
    },
    onSuccess: (_url, { reservation }) => {
      queryClient.invalidateQueries({
        queryKey: ["reservations", "files", reservation.id],
      });
    },
  });
}

export function useTicketPdfUrl() {
  const generate = useGenerateTicketPdf();
  return {
    ...generate,
    mutateAsync: (reservation: ReservationWithRelations) =>
      generate.mutateAsync({
        reservation,
        customer: {
          full_name: reservation.customer?.full_name ?? "Cliente",
          phone: reservation.customer?.phone ?? null,
          email: reservation.customer?.email ?? null,
        },
      }),
  };
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      updateReservationStatus(id, status),
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}
