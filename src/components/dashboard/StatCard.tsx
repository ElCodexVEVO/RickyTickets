import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { clsx } from "clsx";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  delayMs = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive";
  delayMs?: number;
}) {
  return (
    <Card className="flex animate-fade-in-up items-center gap-4 p-5" style={{ animationDelay: `${delayMs}ms` }}>
      <div
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone === "positive" ? "bg-positive-50 text-positive-700" : "bg-carbon-950 text-gold-400",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-semibold text-ink-900 truncate">{value}</p>
        {hint && <p className="text-xs text-ink-500">{hint}</p>}
      </div>
    </Card>
  );
}
