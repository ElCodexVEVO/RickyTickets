import { Construction } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export function ComingSoonPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        icon={Construction}
        title="En construcción"
        description="Este módulo se está construyendo en la siguiente etapa."
      />
    </div>
  );
}
