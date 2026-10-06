import type { ReactNode } from "react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "positive" | "danger";
}) {
  const tones = {
    neutral: "bg-carbon-700 text-ink-700",
    warning: "bg-pending-50 text-pending-500",
    positive: "bg-positive-50 text-positive-700",
    danger: "bg-danger-50 text-danger-500",
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border border-current/10 px-2 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
