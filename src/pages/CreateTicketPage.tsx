import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Download,
  Eye,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TicketForm,
  ticketSteps,
  stepFields,
} from "@/components/tickets/TicketForm";
import { TicketPreview } from "@/components/tickets/TicketPreview";
import { ReservationSummary } from "@/components/tickets/ReservationSummary";
import {
  reservationFormDefaults,
  reservationFormSchema,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import { ticketDataFromForm } from "@/pdf/buildTicketData";
import { useCreateReservation } from "@/features/reservations/hooks";
import { useCompanySettings } from "@/features/settings/hooks";
import type {
  ReservationRow,
  ReservationWithRelations,
} from "@/types/database.types";
import { QueryState } from "@/components/ui/QueryState";
import { useVehicles } from "@/features/vehicles/hooks";
import { useDrivers } from "@/features/drivers/hooks";
import { reservationLocationDefaults } from "@/lib/reservationLocations";

function defaultsFromDuplicate(
  source: ReservationWithRelations,
): ReservationFormValues {
  return {
    ...reservationFormDefaults,
    ...reservationLocationDefaults(source),
    customer_full_name: source.customer?.full_name ?? "",
    customer_phone: source.customer?.phone ?? "",
    customer_email: source.customer?.email ?? "",
    passengers: source.passengers,
    service_type: source.service_type,
    service_catalog_item_id: source.service_catalog_item_id ?? "",
    return_time_pending:
      source.service_type === "redondo" && !source.return_time,
    return_pickup_point: source.return_pickup_point ?? "",
    return_dropoff_point: source.return_dropoff_point ?? "",
    return_airline: source.return_airline ?? "",
    return_flight_number: source.return_flight_number ?? "",
    pickup_point: source.pickup_point,
    dropoff_point: source.dropoff_point,
    hotel: source.hotel ?? "",
    room: source.room ?? "",
    airline: source.airline ?? "",
    flight_number: source.flight_number ?? "",
    price: source.price != null ? String(source.price) : "",
    currency: source.currency,
    payment_method: source.payment_method ?? "",
    notes: source.notes ?? "",
    vehicle_id: source.vehicle_id ?? "",
    driver_id: source.driver_id ?? "",
  };
}

export default function CreateTicketPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFrom = (
    location.state as { duplicateFrom?: ReservationWithRelations } | null
  )?.duplicateFrom;

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: duplicateFrom
      ? defaultsFromDuplicate(duplicateFrom)
      : reservationFormDefaults,
    mode: "onBlur",
  });

  const createReservation = useCreateReservation();
  const settings = useCompanySettings();
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const [step, setStep] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savedReservation, setSavedReservation] =
    useState<ReservationRow | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values = form.watch();
  const previewData = {
    ...ticketDataFromForm(values),
    vehicleName: vehicles.data?.find((v) => v.id === values.vehicle_id)?.model,
    driverName: drivers.data?.find((d) => d.id === values.driver_id)?.full_name,
  };

  async function onSubmit(data: ReservationFormValues) {
    if (step !== 5) return;
    setSubmitError(null);
    try {
      if (!settings.data || settings.isError || settings.isPlaceholderData)
        throw new Error(
          "Espera a que cargue la configuración de tickets antes de guardar.",
        );
      const reservation = await createReservation.mutateAsync(data);
      setSavedReservation(reservation);

      setGeneratingPdf(true);
      const { generateAndStoreTicketPdf } =
        await import("@/pdf/generateTicketPdf");
      const { signedUrl } = await generateAndStoreTicketPdf({
        reservation,
        customer: {
          full_name: data.customer_full_name,
          phone: data.customer_phone,
          email: data.customer_email || null,
        },
        companyInfo: settings.data!.companyInfo,
        meetingPoints: settings.data!.meetingPoints,
        ticketTerms: settings.data!.ticketTerms,
      });
      setPdfUrl(signedUrl);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "No se pudo crear la reservación.",
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleReset() {
    form.reset(reservationFormDefaults);
    setStep(0);
    setSavedReservation(null);
    setPdfUrl(null);
    setSubmitError(null);
  }

  if (savedReservation) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in-up py-10 text-center">
        <div className="mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-positive-50 text-positive-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">
          Ticket creado
        </h1>
        <p className="mt-1 font-mono-tab text-sm text-ink-500">
          Folio {savedReservation.folio}
        </p>
        {generatingPdf && (
          <p role="status" className="mt-3 text-sm text-ink-500">
            Generando PDF…
          </p>
        )}
        {submitError && (
          <p role="alert" className="mt-3 text-sm text-danger-500">
            Reservación guardada. El PDF no se completó: {submitError}.
            Regénéralo desde el detalle; no vuelvas a crear la reservación.
          </p>
        )}

        <Card className="mt-6 p-4 text-left">
          <TicketPreview
            data={{
              ...previewData,
              folio: savedReservation.folio,
              status: savedReservation.status,
            }}
          />
        </Card>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="secondary"
            disabled={!pdfUrl || generatingPdf}
            onClick={() => pdfUrl && window.open(pdfUrl, "_blank")}
          >
            <Eye className="h-4 w-4" />
            Ver PDF
          </Button>
          <Button
            variant="secondary"
            disabled={!pdfUrl || generatingPdf}
            onClick={() => {
              if (!pdfUrl) return;
              const a = document.createElement("a");
              a.href = pdfUrl;
              a.download = `${savedReservation.folio}.pdf`;
              a.click();
            }}
          >
            <Download className="h-4 w-4" />
            Descargar
          </Button>
          <Button
            variant="secondary"
            disabled={!pdfUrl}
            onClick={() => {
              const text = encodeURIComponent(
                `Tu ticket de Danny Transfers (${savedReservation.folio}): ${pdfUrl}`,
              );
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Compartir por WhatsApp
          </Button>
          <Button
            onClick={() => navigate(`/reservaciones/${savedReservation.id}`)}
          >
            Ver reservación
          </Button>
        </div>

        <button
          onClick={handleReset}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Crear otro ticket
        </button>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div
        className={
          embedded
            ? "composer-wizard"
            : "standalone-wizard mx-auto max-w-[1150px]"
        }
      >
        {!embedded && (
          <PageHeader
            title="Nueva reservación"
            subtitle="Completa la información para generar el ticket."
          />
        )}
        <div className="wizard-stepper" aria-label="Pasos de reservación">
          {ticketSteps.map((label, index) => (
            <button
              type="button"
              key={label}
              onClick={() => setStep(index)}
              aria-current={step === index ? "step" : undefined}
              className={step === index ? "text-gold-300" : "text-ink-500"}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <QueryState loading={settings.isPending} error={settings.error} />

        <div
          className={`grid grid-cols-1 gap-6 ${embedded ? "" : "xl:grid-cols-[minmax(0,1fr)_340px]"}`}
        >
          <Card className="wizard-form-card p-5 sm:p-6">
            <form
              className="wizard-form"
              onSubmit={form.handleSubmit(onSubmit, (errors) => {
                const first = Object.keys(
                  errors,
                )[0] as keyof ReservationFormValues;
                const invalidStep = stepFields.findIndex((fields) =>
                  fields.includes(first),
                );
                setStep(invalidStep < 0 ? 0 : invalidStep);
              })}
            >
              <TicketForm step={step} />
              {embedded && <ReservationSummary data={previewData} />}

              {submitError && (
                <p className="mt-4 rounded-lg bg-gold-300/20 px-3 py-2 text-sm font-medium text-gold-700">
                  {submitError}
                </p>
              )}

              <div className="wizard-footer">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                >
                  Limpiar
                </Button>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep((v) => v - 1)}
                  >
                    Anterior
                  </Button>
                )}
                {step < 5 ? (
                  <Button
                    key="next-step"
                    type="button"
                    className="wizard-next"
                    onClick={async () => {
                      if (await form.trigger(stepFields[step]))
                        setStep((v) => v + 1);
                    }}
                  >
                    Siguiente →
                  </Button>
                ) : (
                  <Button
                    key="save-reservation"
                    type="submit"
                    className="wizard-next"
                    disabled={settings.isPending || settings.isError}
                    loading={createReservation.isPending || generatingPdf}
                  >
                    Guardar y generar PDF
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {!embedded && (
            <div className="rounded-xl border border-line bg-carbon-900 p-3 xl:sticky xl:top-20 xl:self-start">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold">Vista previa del ticket</p>
                <span className="text-[9px] text-positive-700">
                  Actualización en tiempo real
                </span>
              </div>
              <TicketPreview data={previewData} />
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}
