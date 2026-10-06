import { useId, type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import { Card } from "@/components/ui/Card";
import { FieldWrapper, Input } from "@/components/ui/Field";
import type { ReservationFormValues } from "@/lib/validators/reservationSchema";

export const sectionIds = {
  client: "reservacion-cliente",
  route: "reservacion-ruta",
  flight: "reservacion-vuelo",
  hotel: "reservacion-hotel",
  payment: "reservacion-pago",
  notes: "reservacion-notas",
} as const;

// Lleva el foco al primer campo editable de una sección (enlaces «Editar» del resumen).
export function focusSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  section
    .querySelector<HTMLElement>(
      "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button[role=switch]",
    )
    ?.focus({ preventScroll: true });
}

export function FormSection({
  id,
  step,
  title,
  aside,
  children,
}: {
  id: string;
  step: number;
  title: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <div className="panel-heading min-h-[46px] flex-wrap">
        <h2 id={`${id}-title`}>
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-carbon-600 bg-carbon-800 text-[11px] font-semibold text-ink-700">
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children && <div className="p-4">{children}</div>}
    </Card>
  );
}

type TextName = {
  [K in keyof ReservationFormValues]-?: ReservationFormValues[K] extends
    string | null | undefined
    ? K
    : never;
}[keyof ReservationFormValues];

export function TextField({
  name,
  label,
  type = "text",
  required = false,
  disabled,
  list,
  placeholder,
  hint,
  min,
  className,
  autoComplete,
}: {
  name: TextName;
  label: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  list?: string;
  placeholder?: string;
  hint?: string;
  min?: string;
  className?: string;
  autoComplete?: string;
}) {
  const id = useId();
  const {
    register,
    formState: { errors },
  } = useFormContext<ReservationFormValues>();
  const error = errors[name]?.message;
  return (
    <FieldWrapper
      label={label}
      htmlFor={id}
      required={required}
      error={typeof error === "string" ? error : undefined}
      hint={hint}
      className={className}
    >
      <Input
        id={id}
        type={type}
        list={list}
        min={min}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        invalid={!!error}
        {...register(name)}
      />
    </FieldWrapper>
  );
}
