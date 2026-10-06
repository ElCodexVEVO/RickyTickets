import { Badge } from "@/components/ui/Badge";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { statusIcons } from "@/lib/assets";
import { paymentStatusLabels, type PaymentStatus } from "@/lib/payments";

const tones = {
  pending: "neutral",
  partial: "warning",
  paid: "positive",
} as const;

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={tones[status]}>
      <span className="inline-flex items-center gap-1.5">
        <AssetIcon src={statusIcons[status]} size={13} />
        {paymentStatusLabels[status]}
      </span>
    </Badge>
  );
}
