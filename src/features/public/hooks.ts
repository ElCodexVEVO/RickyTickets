import { useQuery } from "@tanstack/react-query";
import { getPublicTicket } from "@/features/public/api";

export function usePublicTicket(reservationId: string | undefined) {
  return useQuery({
    queryKey: ["public-ticket", reservationId],
    queryFn: () => getPublicTicket(reservationId!),
    enabled: !!reservationId,
    retry: 0,
  });
}
