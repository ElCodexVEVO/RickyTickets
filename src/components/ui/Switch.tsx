import { clsx } from "clsx";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label
      className={clsx(
        "inline-flex items-center gap-2 text-sm text-ink-700",
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
          checked
            ? "border-gold-400 bg-gold-500"
            : "border-carbon-600 bg-carbon-800",
        )}
      >
        <span
          className={clsx(
            "absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full transition-transform duration-150",
            checked
              ? "translate-x-[18px] bg-carbon-950"
              : "translate-x-0.5 bg-ink-500",
          )}
        />
      </button>
      {label}
    </label>
  );
}
