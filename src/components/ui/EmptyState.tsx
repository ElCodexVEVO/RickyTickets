import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex animate-fade-in-up flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface-950 py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800 text-gold-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink-900">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-ink-500 max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
