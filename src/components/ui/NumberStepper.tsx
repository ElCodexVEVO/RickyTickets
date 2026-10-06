import { Minus, Plus } from "lucide-react";
import { clsx } from "clsx";

export function NumberStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 60,
  disabled,
  invalid,
  decrementLabel,
  incrementLabel,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  invalid?: boolean;
  decrementLabel: string;
  incrementLabel: string;
}) {
  const current = Number.isFinite(value) ? value : min;
  const button =
    "flex w-10 shrink-0 items-center justify-center text-ink-700 transition-colors hover:bg-surface-800 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div
      className={clsx(
        "field-control flex items-stretch overflow-hidden rounded-lg border bg-white transition-colors focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20",
        invalid ? "border-danger-500" : "border-line",
      )}
    >
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={disabled || current <= min}
        onClick={() => onChange(Math.max(min, current - 1))}
        className={clsx(button, "border-r border-line")}
      >
        <Minus size={15} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="min-w-0 flex-1 bg-transparent text-center font-mono-tab text-sm text-ink-900 outline-none [appearance:textfield] disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={disabled || current >= max}
        onClick={() => onChange(Math.min(max, current + 1))}
        className={clsx(button, "border-l border-line")}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
