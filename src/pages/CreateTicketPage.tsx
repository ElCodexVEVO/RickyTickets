import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Download, Eye, MessageCircle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TicketForm } from "@/components/tickets/TicketForm";
import { TicketPreview } from "@/components/tickets/TicketPreview";
import {
  reservationFormDefaults,
  reservationFormSchema,
  type ReservationFormValues,
} from "@/lib/validators/reservationSchema";
import { ticketDataFromForm } from "@/pdf/buildTicketData";
import { useCreateReservation } from "@/features/reservations/hooks";
import { useCompanySettings } from "@/features/settings/hooks";
import { generateAndStoreTicketPdf } from "@/pdf/generateTicketPdf";
import type { ReservationRow, ReservationWithRelations } from "@/types/database.types";

function defaultsFromDuplicate(source: ReservationWithRelations): ReservationFormValues {
  return {
    ...reservationFormDefaults,
    customer_full_name: source.customer?.full_name ?? "",
    customer_phone: source.customer?.phone ?? "",
    customer_email: source.customer?.email ?? "",
    passengers: source.passengers,
    service_type: source.service_type,
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

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFrom = (location.state as { duplicateFrom?: ReservationWithRelations } | null)?.duplicateFrom;

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: duplicateFrom ? defaultsFromDuplicate(duplicateFrom) : reservationFormDefaults,
    mode: "onBlur",
  });

  const createReservation = useCreateReservation();
  const settings = useCompanySettings();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [savedReservation, setSavedReservation] = useState<ReservationRow | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const values = form.watch();
  const previewData = ticketDataFromForm(values);

  async function onSubmit(data: ReservationFormValues) {
    setSubmitError(null);
    try {
      const reservation = await createReservation.mutateAsync(data);
      setSavedReservation(reservation);

      setGeneratingPdf(true);
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
      setSubmitError(err instanceof Error ? err.message : "No se pudo crear la reservación.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  function handleReset() {
    form.reset(reservationFormDefaults);
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
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-900">Ticket creado</h1>
        <p className="mt-1 font-mono-tab text-sm text-ink-500">Folio {savedReservation.folio}</p>

        <Card className="mt-6 p-4 text-left">
          <TicketPreview data={ticketDataFromForm(values)} />
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
              const text = encodeURIComponent(`Tu ticket de Danny Transfers (${savedReservation.folio}): ${pdfUrl}`);
              window.open(`https://wa.me/?text=${text}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Compartir por WhatsApp
          </Button>
          <Button onClick={() => navigate(`/reservaciones/${savedReservation.id}`)}>Ver reservación</Button>
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
      <PageHeader title="Crear Ticket" subtitle="Completa la información para generar el ticket." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TicketForm />

            {submitError && (
              <p className="mt-4 rounded-lg bg-gold-300/20 px-3 py-2 text-sm font-medium text-gold-700">
                {submitError}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-2 border-t border-cream-200 pt-5">
              <Button type="button" variant="secondary" onClick={handleReset}>
                Limpiar
              </Button>
              <Button type="submit" loading={createReservation.isPending || generatingPdf}>
                Generar Ticket (PDF)
              </Button>
            </div>
          </form>
        </Card>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Vista previa del ticket</p>
          <TicketPreview data={previewData} />
        </div>
      </div>
    </FormProvider>
  );
}
