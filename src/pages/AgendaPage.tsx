import { PageHeader } from "@/components/ui/PageHeader";
import { QueryState } from "@/components/ui/QueryState";
import { AgendaView } from "@/components/operations/AgendaView";
import { useReservations } from "@/features/reservations/hooks";
export default function AgendaPage() {
  const query = useReservations({});
  return (
    <div>
      <PageHeader
        title="Agenda / Servicios"
        subtitle="Ida y regreso en una agenda operativa compartida."
      />
      <QueryState
        loading={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data && <AgendaView reservations={query.data} />}
    </div>
  );
}
