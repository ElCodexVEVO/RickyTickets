import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProfiles,
  updateProfileAccess,
  createEmployee,
} from "@/features/users/api";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: listProfiles,
    retry: 0,
  });
}

export function useUpdateProfileAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateProfileAccess>[1];
    }) => updateProfileAccess(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profiles"] }),
  });
}
