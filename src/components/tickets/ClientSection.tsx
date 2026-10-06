import { useId, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Search, UserCheck, UserPlus, X } from "lucide-react";
import { useCustomerSearch } from "@/features/customers/hooks";
import { FieldWrapper, Input } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { FormSection, TextField, sectionIds } from "./FormSection";
import { splitPhone } from "@/lib/phone";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";
import type { CustomerRow } from "@/types/database.types";

function CustomerSearch({ onPick }: { onPick: (c: CustomerRow) => void }) {
  const id = useId();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = useCustomerSearch(term);
  const matches = search.data ?? [];
  const searching = term.trim().length >= 2;
  const expanded = open && searching;
  function pick(c: CustomerRow) {
    onPick(c);
    setTerm("");
    setOpen(false);
  }
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        Buscar cliente existente
      </label>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
      />
      <Input
        id={id}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && matches[active] ? `${id}-${active}` : undefined
        }
        autoComplete="off"
        value={term}
        placeholder="Buscar cliente existente por nombre, teléfono o correo"
        className="pl-9"
        onChange={(e) => {
          setTerm(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!expanded || !matches.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((v) => (v + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((v) => (v - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          }
        }}
      />
      {expanded && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-carbon-900 shadow-xl">
          <ul
            id={`${id}-list`}
            role="listbox"
            aria-label="Clientes encontrados"
          >
            {matches.map((c, i) => (
              <li
                key={c.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${i === active ? "bg-carbon-800" : ""}`}
              >
                <UserCheck className="h-4 w-4 shrink-0 text-gold-400" />
                <span className="min-w-0 flex-1 truncate">{c.full_name}</span>
                <span className="shrink-0 truncate text-xs text-ink-500">
                  {[c.phone, c.email].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 border-t border-line px-3 py-2 text-xs text-ink-500">
            <UserPlus className="h-3.5 w-3.5" />
            {search.isPending
              ? "Buscando…"
              : matches.length
                ? "Si no aparece, escribe sus datos abajo: se registrará al guardar."
                : "Sin coincidencias. Escribe sus datos abajo para registrarlo al guardar."}
          </p>
        </div>
      )}
    </div>
  );
}

export function ClientSection({ editing = false }: { editing?: boolean }) {
  const phoneId = useId();
  const paxId = useId();
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  const [existing, setExisting] = useState<CustomerRow | null>(null);
  const name = useWatch({ control, name: "customer_full_name" });
  const phoneCountry = useWatch({ control, name: "phone_country" });
  const fill = { shouldDirty: true, shouldValidate: true } as const;

  function pick(c: CustomerRow) {
    const phone = splitPhone(c.phone ?? "", getValues("phone_country"));
    setValue("customer_full_name", c.full_name, fill);
    setValue("phone_country", phone.iso, fill);
    setValue("customer_phone", phone.local, fill);
    setValue("customer_email", c.email ?? "", fill);
    setExisting(c);
  }
  function startNew() {
    setExisting(null);
    setValue("customer_full_name", "", { shouldDirty: true });
    setValue("customer_phone", "", { shouldDirty: true });
    setValue("customer_email", "", { shouldDirty: true });
  }

  return (
    <FormSection
      id={sectionIds.client}
      step={1}
      title="Cliente"
      aside={
        !editing &&
        existing && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300"
          >
            <X size={13} />
            Nuevo cliente
          </button>
        )
      }
    >
      <div className="space-y-3">
        {!editing && <CustomerSearch onPick={pick} />}
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.15fr)_minmax(0,1.15fr)_136px]">
          <TextField
            name="customer_full_name"
            label="Nombre completo"
            required
            disabled={editing}
            autoComplete="off"
            placeholder="Ej. Mia Hamilton"
          />
          <FieldWrapper
            label="Teléfono"
            htmlFor={phoneId}
            required
            error={errors.customer_phone?.message}
          >
            <Controller
              control={control}
              name="customer_phone"
              render={({ field }) => (
                <PhoneInput
                  ref={field.ref}
                  id={phoneId}
                  name={field.name}
                  value={field.value}
                  disabled={editing}
                  invalid={!!errors.customer_phone}
                  placeholder="999 123 4567"
                  country={phoneCountry}
                  onCountryChange={(iso) => {
                    setValue("phone_country", iso, { shouldDirty: true });
                    setExisting(null);
                  }}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const typed = e.target.value;
                    // Un número pegado con prefijo («+1 305…») elige el país.
                    if (typed.trim().startsWith("+")) {
                      const split = splitPhone(
                        typed,
                        getValues("phone_country"),
                      );
                      setValue("phone_country", split.iso, {
                        shouldDirty: true,
                      });
                      field.onChange(split.iso ? split.local : typed);
                    } else field.onChange(typed);
                    setExisting(null);
                  }}
                />
              )}
            />
          </FieldWrapper>
          <TextField
            name="customer_email"
            label="Correo"
            type="email"
            disabled={editing}
            autoComplete="off"
            placeholder="cliente@correo.com"
          />
          <FieldWrapper
            label="Pasajeros"
            htmlFor={paxId}
            required
            error={errors.passengers?.message}
          >
            <Controller
              control={control}
              name="passengers"
              render={({ field }) => (
                <NumberStepper
                  id={paxId}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    field.onBlur();
                  }}
                  invalid={!!errors.passengers}
                  decrementLabel="Quitar un pasajero"
                  incrementLabel="Agregar un pasajero"
                />
              )}
            />
          </FieldWrapper>
        </div>
        <p
          className="flex items-center gap-1.5 text-xs text-ink-500"
          aria-live="polite"
        >
          {editing ? (
            "Los datos de contacto pertenecen a la ficha del cliente y no se modifican desde la reservación."
          ) : existing ? (
            <>
              <UserCheck size={13} className="text-positive-700" />
              Cliente existente · {existing.full_name}
            </>
          ) : name?.trim() ? (
            <>
              <UserPlus size={13} className="text-gold-400" />
              Cliente nuevo: se registrará al guardar si no existe su teléfono o
              correo.
            </>
          ) : (
            "Busca un cliente o escribe sus datos para darlo de alta al guardar."
          )}
        </p>
      </div>
    </FormSection>
  );
}
