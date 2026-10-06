import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ActivityList } from "@/components/reservations/ActivityList";
export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Actividad"
        subtitle="Historial real de acciones del equipo."
      />
      <Card className="p-5">
        <ActivityList />
      </Card>
    </div>
  );
}
