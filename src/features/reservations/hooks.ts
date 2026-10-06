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
  ReservationStatus,
  ReservationWithRelations,
} from "@/types/database.types";
import { useCompanySettings } from "@/features/settings/hooks";

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
    enabled,
    retry: 0,
  });
}

export function useReservation(id: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "detail", id],
    queryFn: () => getReservation(id!),
    enabled: !!id,
    retry: 0,
  });
}

export function useReservationStatusHistory(id: string | undefined) {
  return useQuery({
    queryKey: ["reservations", "history", id],
    queryFn: () => getReservationStatusHistory(id!),
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

export function useTicketPdfUrl() {
  const settings = useCompanySettings();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: ReservationWithRelations) => {
      if (!settings.data)
        throw new Error(
          "La configuración de la empresa aún no está disponible.",
        );
      const { generateAndStoreTicketPdf } =
        await import("@/pdf/generateTicketPdf");
      // Siempre regenera: el PDF debe reflejar el estado y los datos actuales
      // de la reservación (precio, estado, etc.), nunca una versión cacheada
      // de cuando se creó el ticket.
      const { signedUrl } = await generateAndStoreTicketPdf({
        reservation,
        customer: {
          full_name: reservation.customer?.full_name ?? "Cliente",
          phone: reservation.customer?.phone ?? null,
          email: reservation.customer?.email ?? null,
        },
        companyInfo: settings.data.companyInfo,
        meetingPoints: settings.data.meetingPoints,
        ticketTerms: settings.data.ticketTerms,
      });
      if (!signedUrl) throw new Error("No se pudo generar la URL del PDF");
      return signedUrl;
    },
    onSuccess: (_url, reservation) => {
      queryClient.invalidateQueries({
        queryKey: ["reservations", "files", reservation.id],
      });
    },
  });
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      updateReservationStatus(id, status),
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}
