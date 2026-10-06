import { forwardRef, type InputHTMLAttributes } from "react";
import { clsx } from "clsx";
import { ChevronDown, Globe } from "lucide-react";
import {
  AR,
  BR,
  CA,
  CO,
  DE,
  ES,
  FR,
  GB,
  IT,
  MX,
  US,
} from "country-flag-icons/react/3x2";
import { phoneCountries } from "@/lib/phone";

const flags = { AR, BR, CA, CO, DE, ES, FR, GB, IT, MX, US };

// Selector de país (ISO + prefijo de mapping/countries.json) unido al número. El
// select nativo queda encima de la bandera para conservar teclado y lector de pantalla.
export const PhoneInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    country: string;
    onCountryChange: (iso: string) => void;
    invalid?: boolean;
  }
>(function PhoneInput(
  { country, onCountryChange, invalid, disabled, className, id, ...props },
  ref,
) {
  const current = phoneCountries.find((c) => c.iso === country);
  const Flag = current ? flags[current.iso as keyof typeof flags] : undefined;
  return (
    <div
      className={clsx(
        "field-control flex items-stretch overflow-hidden rounded-lg border bg-white text-sm transition-colors focus-within:border-gold-500 focus-within:ring-2 focus-within:ring-gold-500/20",
        invalid ? "border-danger-500" : "border-line",
        disabled && "opacity-55",
        className,
      )}
    >
      <div className="relative flex shrink-0 items-center gap-1.5 border-r border-line pl-3 pr-2 text-ink-700">
        {Flag ? (
          <Flag aria-hidden="true" className="h-3 w-[18px] rounded-[2px]" />
        ) : (
          <Globe size={14} aria-hidden="true" />
        )}
        <span className="font-mono-tab text-xs">{current?.dial ?? "—"}</span>
        <ChevronDown size={12} className="text-ink-500" aria-hidden="true" />
        <select
          aria-label="País del teléfono"
          value={country}
          disabled={disabled}
          onChange={(e) => onCountryChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {!current && <option value="">Sin prefijo</option>}
          {phoneCountries.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.country} ({c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        ref={ref}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent px-3 text-ink-900 outline-none placeholder:text-ink-300 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
});
