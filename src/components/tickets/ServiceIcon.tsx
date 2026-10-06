import { Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { serviceIcons, serviceKind } from "@/lib/assets";

// Llegada y salida se distinguen con los iconos de lucide (la familia del resto
// del sistema); hotel, tour, traslado y personalizado usan el pack de assets.
export function ServiceIcon({
  item,
  size = 16,
  className,
}: {
  item: { code: string | null; label: string };
  size?: number;
  className?: string;
}) {
  const kind = serviceKind(item);
  const lucide = {
    arrival: PlaneLanding,
    departure: PlaneTakeoff,
    airport: Plane,
  };
  if (kind === "arrival" || kind === "departure" || kind === "airport") {
    const Icon = lucide[kind];
    return (
      <Icon
        size={size}
        strokeWidth={1.8}
        aria-hidden="true"
        className={className}
      />
    );
  }
  return (
    <AssetIcon src={serviceIcons[kind]} size={size} className={className} />
  );
}
