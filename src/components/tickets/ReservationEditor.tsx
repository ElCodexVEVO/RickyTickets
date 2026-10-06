import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePenLine, FileText, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { QueryState } from "@/components/ui/QueryState";
import { ClientSection } from "./ClientSection";
import { ServiceRouteSection } from "./ServiceRouteSection";
import {
  FlightSection,
  HotelSection,
  NotesSection,
  PaymentSection,
} from "./ReservationFormSections";
import { ReservationSummary } from "./ReservationSummary";
import { ReservationSaved } from "./ReservationSaved";
import {
  reservationSchemaFor,
  type ReservationFormValues,
  type SaveIntent,
} from "@/lib/validators/reservationSchema";
import {
  reservationPayload,
  type ReservationEditableFields,
} from "@/features/reservations/api";
import {
  useCreateReservation,
  useGenerateTicketPdf,
  useUpdateReservationFields,
  type TicketCustomer,
} from "@/features/reservations/hooks";
import { useQuickReservationSupport } from "@/features/reservations/locationHooks";
import {
  useCatalogs,
  useServiceCatalogSupport,
} from "@/features/settings/catalogs";
import { useCompanySettings } from "@/features/settings/hooks";
import { ticketDataFromReservation } from "@/pdf/buildTicketData";
import { joinPhone } from "@/lib/phone";
import type {
  ReservationRow,
  ReservationWithRelations,
} from "@/types/database.types";

type Action = "draft" | "save" | "pdf";

function errorText(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

// El editor nunca cambia el cliente de una reservación existente.
function editablePatch(
  values: ReservationFormValues,
  reservation: ReservationWithRelations,
): Partial<ReservationEditableFields> {
  return Object.fromEntries(
    Object.entries(reservationPayload(values)).filter(
      ([key]) =>
        !key.startsWith("customer_") &&
        (key !== "service_catalog_item_id" ||
          "service_catalog_item_id" in reservation),
    ),
  ) as Partial<ReservationEditableFields>;
}

export function ReservationEditor({
  reservation,
  defaultValues,
  canEdit = true,
  notice,
  headerActions,
  onValuesChange,
  onPersisted,
  onReset,
}: {
  reservation?: ReservationWithRelations;
  defaultValues: ReservationFormValues;
  canEdit?: boolean;
  notice?: string;
  headerActions?: ReactNode;
  onValuesChange?: (values: ReservationFormValues) => void;
  onPersisted?: () => void;
  onReset?: () => void;
}) {
  const editing = !!reservation;
  const continuingDraft = !reservation || reservation.status === "draft";
  const navigate = useNavigate();
  const intent = useRef<SaveIntent>("final");
  const resolver = useMemo<Resolver<ReservationFormValues>>(() => {
    const draft = zodResolver(reservationSchemaFor("draft", editing));
    const final = zodResolver(reservationSchemaFor("final", editing));
    return (values, context, options) =>
      (intent.current === "draft" ? draft : final)(values, context, options);
  }, [editing]);
  const form = useForm<ReservationFormValues>({
    resolver,
    defaultValues,
    mode: "onBlur",
  });

  const catalog = useCatalogs();
  const catalogSupport = useServiceCatalogSupport();
  const quick = useQuickReservationSupport();
  const settings = useCompanySettings();
  const create = useCreateReservation();
  const update = useUpdateReservationFields(reservation?.id ?? "");
  const generatePdf = useGenerateTicketPdf();
  const [busy, setBusy] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(notice ? { tone: "success", text: notice } : null);
  const [saved, setSaved] = useState<{
    reservation: ReservationRow;
    customer: TicketCustomer;
    updated: boolean;
  } | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!onValuesChange) return;
    const subscription = form.watch((values) =>
      onValuesChange(values as ReservationFormValues),
    );
    return () => subscription.unsubscribe();
  }, [form, onValuesChange]);

  const active = (catalog.data ?? []).filter((c) => c.active);
  const services = active.filter((c) => c.kind === "service_type");
  const serviceLabel = (id?: string | null) =>
    catalog.data?.find((c) => c.id === id)?.label;
  const settingsReady =
    !!settings.data && !settings.isError && !settings.isPlaceholderData;

  async function generate(row: ReservationRow, customer: TicketCustomer) {
    setPdfError(null);
    setPdfUrl(null);
    try {
      setPdfUrl(await generatePdf.mutateAsync({ reservation: row, customer }));
    } catch (err) {
      setPdfError(errorText(err, "Error desconocido"));
    }
  }

  async function persist(action: Action, data: ReservationFormValues) {
    if (!reservation) {
      if (action === "pdf" && !settingsReady)
        throw new Error(
          "Espera a que cargue la configuración de tickets antes de guardar.",
        );
      const row = await create.mutateAsync({
        values: data,
        intent: action === "draft" ? "draft" : "final",
      });
      onPersisted?.();
      if (action === "draft") {
        navigate(`/reservaciones/${row.id}/editar`, {
          replace: true,
          state: {
            notice: `Borrador ${row.folio} guardado. Puedes continuarlo desde Reservaciones.`,
          },
        });
        return;
      }
      const customer = {
        full_name: data.customer_full_name.trim(),
        phone: joinPhone(data.phone_country, data.customer_phone) || null,
        email: data.customer_email || null,
      };
      setSaved({ reservation: row, customer, updated: false });
      await generate(row, customer);
      return;
    }
    const patch = editablePatch(data, reservation);
    if (action !== "pdf") {
      await update.mutateAsync(patch);
      form.reset(data);
      setFeedback({
        tone: "success",
        text:
          action === "draft"
            ? "Borrador actualizado."
            : "Cambios guardados. Usa «Guardar y generar PDF» para actualizar el ticket.",
      });
      return;
    }
    if (!settingsReady)
      throw new Error(
        "Espera a que cargue la configuración de tickets antes de guardar.",
      );
    // Completar un borrador lo convierte en una reservación pendiente.
    const row = await update.mutateAsync(
      reservation.status === "draft" ? { ...patch, status: "pending" } : patch,
    );
    const customer = {
      full_name: reservation.customer?.full_name ?? "Cliente",
      phone: reservation.customer?.phone ?? null,
      email: reservation.customer?.email ?? null,
    };
    setSaved({
      reservation: row,
      customer,
      updated: reservation.status !== "draft",
    });
    await generate(row, customer);
  }

  async function run(action: Action) {
    if (busy || !canEdit) return;
    intent.current = action === "draft" ? "draft" : "final";
    setFeedback(null);
    setBusy(action);
    try {
      await form.handleSubmit(
        async (data) => {
          try {
            await persist(action, data);
          } catch (err) {
            setFeedback({
              tone: "error",
              text: errorText(err, "No se pudo guardar la reservación."),
            });
          }
        },
        () =>
          setFeedback({
            tone: "error",
            text:
              action === "draft"
                ? "Para guardar el borrador indica cliente, teléfono, ruta, fecha y hora de ida."
                : "Revisa los campos marcados antes de guardar.",
          }),
      )();
    } finally {
      intent.current = "final";
      setBusy(null);
    }
  }

  if (saved)
    return (
      <ReservationSaved
        reservation={saved.reservation}
        preview={ticketDataFromReservation(
          saved.reservation,
          saved.customer,
          serviceLabel(saved.reservation.service_catalog_item_id),
        )}
        pdfUrl={pdfUrl}
        generating={generatePdf.isPending}
        pdfError={pdfError}
        updated={saved.updated}
        onRetryPdf={() => void generate(saved.reservation, saved.customer)}
        onNew={() => (onReset ? onReset() : navigate("/ticket/nuevo"))}
      />
    );

  const actions = (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {continuingDraft ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void run("draft")}
          loading={busy === "draft"}
          disabled={!!busy || !canEdit || quick.data !== true}
          title={
            quick.data === false
              ? "Disponible al aplicar la migración 0008"
              : undefined
          }
        >
          <FilePenLine size={15} />
          Guardar borrador
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void run("save")}
          loading={busy === "save"}
          disabled={!!busy || !canEdit}
        >
          <Save size={15} />
          Guardar cambios
        </Button>
      )}
      <Button
        type="button"
        onClick={() => void run("pdf")}
        loading={busy === "pdf"}
        disabled={!!busy || !canEdit || !settingsReady}
      >
        <FileText size={15} />
        Guardar y generar PDF
      </Button>
      {quick.data === false && continuingDraft && (
        <p className="text-[11px] text-ink-500 sm:col-span-2 xl:col-span-1">
          Borradores, anticipo y hora del vuelo se habilitan al aplicar la
          migración 0008.
        </p>
      )}
    </div>
  );

  const title = !reservation
    ? "Nueva reservación"
    : reservation.status === "draft"
      ? "Continuar borrador"
      : `Editar ${reservation.folio}`;
  const subtitle = !reservation
    ? "Completa la información para generar el ticket."
    : reservation.status === "draft"
      ? [reservation.folio, reservation.customer?.full_name]
          .filter(Boolean)
          .join(" · ")
      : (reservation.customer?.full_name ?? undefined);

  return (
    <FormProvider {...form}>
      <div className="reservation-editor">
        <PageHeader title={title} subtitle={subtitle} actions={headerActions} />
        <QueryState error={catalog.error || settings.error} />
        {feedback && (
          <p
            role={feedback.tone === "error" ? "alert" : "status"}
            className={`mb-4 rounded-lg border p-3 text-sm ${feedback.tone === "error" ? "border-danger-500/30 bg-danger-50 text-danger-500" : "border-positive-500/30 bg-positive-50 text-positive-700"}`}
          >
            {feedback.text}
          </p>
        )}
        {!canEdit && (
          <p className="mb-4 rounded-lg border border-line p-3 text-sm text-ink-500">
            Solo lectura: no tienes permiso para editar esta reservación.
          </p>
        )}
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,27%)]"
        >
          <fieldset
            disabled={!canEdit || !!busy}
            className="@container min-w-0 space-y-4"
          >
            <legend className="sr-only">Datos de la reservación</legend>
            <ClientSection editing={editing} />
            <ServiceRouteSection
              services={services}
              locations={active.filter((c) => c.kind === "location")}
              catalogEnabled={catalogSupport.data === true}
            />
            <FlightSection quickSupported={quick.data} />
            <HotelSection />
            <PaymentSection
              payments={active.filter((c) => c.kind === "payment_method")}
              quickSupported={quick.data}
            />
            <NotesSection />
          </fieldset>
          <ReservationSummary
            folio={reservation?.folio}
            status={reservation?.status ?? "draft"}
            services={services}
            footer={actions}
          />
        </form>
      </div>
    </FormProvider>
  );
}
