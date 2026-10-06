import { useQuery } from "@tanstack/react-query";
import {
  getQuickReservationSupport,
  getReservationLocationSupport,
} from "./api";

export function useReservationLocationSupport() {
  return useQuery({
    queryKey: ["reservation-location-support"],
    queryFn: getReservationLocationSupport,
    retry: 0,
    staleTime: 60_000,
  });
}

// true cuando la base ya tiene 0008 (borradores, anticipo y hora del vuelo).
export function useQuickReservationSupport() {
  return useQuery({
    queryKey: ["reservation-quick-support"],
    queryFn: getQuickReservationSupport,
    retry: 0,
    staleTime: 60_000,
  });
}
