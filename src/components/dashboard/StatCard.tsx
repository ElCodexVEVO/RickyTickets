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
  tone?: "default" | "positive" | "danger" | "info";
  delayMs?: number;
}) {
  return (
    <Card
      className="stat-card flex min-h-[78px] animate-fade-in-up items-center gap-4 px-4 py-2.5"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={clsx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
          tone === "positive"
            ? "bg-positive-50 text-positive-700"
            : tone === "danger"
              ? "bg-danger-500/15 text-danger-500"
              : tone === "info"
                ? "bg-sky-400/15 text-sky-300"
                : "bg-gold-500/15 text-gold-400",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none text-ink-900 truncate">
          {value}
        </p>
        <p className="mt-1 text-xs text-ink-900">{label}</p>
        {hint && <p className="mt-0.5 text-[10px] text-ink-500">{hint}</p>}
      </div>
    </Card>
  );
}
