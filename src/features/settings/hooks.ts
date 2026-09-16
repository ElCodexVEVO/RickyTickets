import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

export interface CompanyInfo {
  name: string;
  tagline: string;
  phone: string;
  instagram: string;
  whatsapp: string;
}

export interface MeetingPoints {
  tulum_airport: string;
  cancun_airport: string;
}

export interface TicketTerms {
  text: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Danny Transfers",
  tagline: "Tulum Mexico",
  phone: "+52 984 239 67 62",
  instagram: "@dannytransfers",
  whatsapp: "+52 984 239 67 62",
};

const DEFAULT_MEETING_POINTS: MeetingPoints = {
  tulum_airport: "At Gate 4",
  cancun_airport: "Terminal 2: Welcome Bar · Terminal 3: Margarita Ville Restaurant · Terminal 4: Welcome Bar",
};

const DEFAULT_TICKET_TERMS: TicketTerms = {
  text: "El pago puede realizarse en efectivo o con tarjeta. Pagos con tarjeta tienen un cargo extra del 5%. En caso de problemas, retrasos o si no encuentra a su conductor, contacte al encargado de operaciones.",
};

export function useCompanySettings() {
  return useQuery({
    queryKey: ["settings", "ticket"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .in("key", ["company_info", "meeting_points", "ticket_terms"]);
      if (error) throw error;

      const map = new Map((data ?? []).map((row) => [row.key, row.value]));
      return {
        companyInfo: (map.get("company_info") as unknown as CompanyInfo) ?? DEFAULT_COMPANY_INFO,
        meetingPoints: (map.get("meeting_points") as unknown as MeetingPoints) ?? DEFAULT_MEETING_POINTS,
        ticketTerms: (map.get("ticket_terms") as unknown as TicketTerms) ?? DEFAULT_TICKET_TERMS,
      };
    },
    retry: 0,
    placeholderData: {
      companyInfo: DEFAULT_COMPANY_INFO,
      meetingPoints: DEFAULT_MEETING_POINTS,
      ticketTerms: DEFAULT_TICKET_TERMS,
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, unknown> }) => {
      const { error } = await supabase.from("settings").upsert({ key, value });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings", "ticket"] }),
  });
}
