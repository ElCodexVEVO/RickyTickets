import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { UserCheck, UserPlus } from "lucide-react";
import { useCustomerSearch } from "@/features/customers/hooks";
import { FieldWrapper, Input } from "@/components/ui/Field";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export function CustomerAutocomplete() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();

  const [focused, setFocused] = useState(false);
  const [selectedExisting, setSelectedExisting] = useState(false);
  const name = watch("customer_full_name");
  const { data: matches } = useCustomerSearch(name ?? "");

  const showDropdown = focused && !selectedExisting && (matches?.length ?? 0) > 0;

  return (
    <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FieldWrapper label="Nombre completo" htmlFor="customer_full_name" required error={errors.customer_full_name?.message}>
        <Input
          id="customer_full_name"
          placeholder="Ej. Mia Hamilton"
          autoComplete="off"
          {...register("customer_full_name")}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={(e) => {
            setSelectedExisting(false);
            register("customer_full_name").onChange(e);
          }}
        />
        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full max-w-sm overflow-hidden rounded-lg border border-cream-200 bg-white shadow-lg">
            {matches!.map((c) => (
              <button
                type="button"
                key={c.id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-cream-50"
                onMouseDown={() => {
                  setValue("customer_full_name", c.full_name);
                  setValue("customer_phone", c.phone ?? "");
                  setValue("customer_email", c.email ?? "");
                  setSelectedExisting(true);
                }}
              >
                <UserCheck className="h-4 w-4 shrink-0 text-gold-600" />
                <span className="min-w-0 flex-1 truncate">{c.full_name}</span>
                <span className="shrink-0 text-xs text-ink-500">{c.phone}</span>
              </button>
            ))}
            <div className="flex items-center gap-2 border-t border-cream-200 px-3 py-2 text-xs text-ink-500">
              <UserPlus className="h-3.5 w-3.5" />
              Si no aparece, se creará como cliente nuevo al guardar.
            </div>
          </div>
        )}
      </FieldWrapper>

      <FieldWrapper label="Teléfono" htmlFor="customer_phone" required error={errors.customer_phone?.message}>
        <Input id="customer_phone" placeholder="+52 999 123 4567" {...register("customer_phone")} />
      </FieldWrapper>
    </div>
  );
}
