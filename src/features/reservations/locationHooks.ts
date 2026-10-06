import { useQuery } from "@tanstack/react-query";
import { getReservationLocationSupport } from "./api";
export function useReservationLocationSupport() {
  return useQuery({ queryKey: ["reservation-location-support"], queryFn: getReservationLocationSupport, retry: 0, staleTime: 60_000 });
}
