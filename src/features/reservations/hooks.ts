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
import type { ReservationStatus, ReservationWithRelations } from "@/types/database.types";
import { getOrCreateTicketPdfUrl } from "@/pdf/generateTicketPdf";
import { useCompanySettings } from "@/features/settings/hooks";

function invalidateReservationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["reservations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-upcoming"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-recent"] });
  queryClient.invalidateQueries({ queryKey: ["customers"] });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReservation,
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}

export function useReservations(filters: ReservationFilters) {
  return useQuery({
    queryKey: ["reservations", filters],
    queryFn: () => listReservations(filters),
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
    mutationFn: ({ id, note }: { id: string; note?: string }) => cancelReservationRpc(id, note),
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
    mutationFn: (patch: Partial<ReservationEditableFields>) => updateReservationFields(id, patch),
    onSuccess: () => {
      invalidateReservationQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["reservations", "detail", id] });
    },
  });
}

export function useTicketPdfUrl() {
  const settings = useCompanySettings();
  return useMutation({
    mutationFn: async (reservation: ReservationWithRelations) => {
      if (!settings.data) throw new Error("La configuración de la empresa aún no está disponible.");
      return getOrCreateTicketPdfUrl({
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
    },
  });
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) => updateReservationStatus(id, status),
    onSuccess: () => invalidateReservationQueries(queryClient),
  });
}
