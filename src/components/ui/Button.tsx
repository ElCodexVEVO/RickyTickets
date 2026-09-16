import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gold-500 text-carbon-950 hover:bg-gold-400 focus-visible:outline-gold-600 font-semibold shadow-sm disabled:bg-gold-300",
  secondary:
    "bg-white text-ink-900 border border-cream-200 hover:bg-cream-100 focus-visible:outline-ink-500",
  ghost: "bg-transparent text-ink-700 hover:bg-cream-100 focus-visible:outline-ink-500",
  danger:
    "bg-carbon-900 text-cream-50 hover:bg-carbon-800 focus-visible:outline-carbon-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg transition-[color,background-color,border-color,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-70",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.97]",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
