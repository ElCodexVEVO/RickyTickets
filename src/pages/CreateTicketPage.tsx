import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReservationEditor } from "@/components/tickets/ReservationEditor";
import {
  reservationFormDefaults,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import { formValuesForDuplicate } from "@/lib/reservationFormValues";
import type { ReservationWithRelations } from "@/types/database.types";

// Lo escrito y no guardado se conserva durante la sesión del navegador (pestaña),
// como hacía el antiguo panel lateral. No sustituye a «Guardar borrador».
const SESSION_KEY = "rt-new-reservation";

function readSession(): ReservationFormValues | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as Partial<ReservationFormValues>;
    return {
      ...reservationFormDefaults,
      ...stored,
      passengers:
        typeof stored.passengers === "number" && stored.passengers > 0
          ? stored.passengers
          : 1,
    };
  } catch {
    return null;
  }
}

function hasContent(values: ReservationFormValues) {
  return [
    values.customer_full_name,
    values.customer_phone,
    values.pickup_point,
    values.dropoff_point,
    values.date,
    values.price,
  ].some((v) => !!v?.trim());
}

export default function CreateTicketPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [initial] = useState(() => {
    const duplicateFrom = (
      location.state as { duplicateFrom?: ReservationWithRelations } | null
    )?.duplicateFrom;
    if (duplicateFrom)
      return {
        values: formValuesForDuplicate(duplicateFrom),
        notice: `Duplicando ${duplicateFrom.folio}: indica las nuevas fechas y horas.`,
      };
    const stored = readSession();
    return stored && hasContent(stored)
      ? {
          values: stored,
          notice: "Se recuperó la reservación sin guardar de esta sesión.",
        }
      : { values: reservationFormDefaults, notice: undefined };
  });
  const [form, setForm] = useState({ key: 0, ...initial });

  const remember = useCallback((values: ReservationFormValues) => {
    try {
      if (hasContent(values))
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(values));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Almacenamiento no disponible: el formulario sigue funcionando. */
    }
  }, []);
  const forget = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Sin almacenamiento de sesión. */
    }
  }, []);
  const reset = useCallback(() => {
    forget();
    setForm((current) => ({
      key: current.key + 1,
      values: reservationFormDefaults,
      notice: undefined,
    }));
    if (location.state)
      navigate(location.pathname, { replace: true, state: null });
  }, [forget, location.pathname, location.state, navigate]);

  return (
    <ReservationEditor
      key={form.key}
      defaultValues={form.values}
      notice={form.notice}
      onValuesChange={remember}
      onPersisted={forget}
      onReset={reset}
      headerActions={
        <Button type="button" size="sm" variant="ghost" onClick={reset}>
          <RotateCcw size={14} />
          Limpiar
        </Button>
      }
    />
  );
}
