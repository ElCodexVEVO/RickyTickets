import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabaseClient";
import { TicketDocument } from "@/pdf/TicketDocument";
import { generateTicketQrDataUrl } from "@/pdf/qr";
import { ticketDataFromReservation } from "@/pdf/buildTicketData";
import type { ReservationRow } from "@/types/database.types";
import type { CompanyInfo, MeetingPoints, TicketTerms } from "@/features/settings/hooks";

export interface GenerateTicketPdfResult {
  blob: Blob;
  storagePath: string;
  signedUrl: string | null;
  version: number;
}

export async function generateAndStoreTicketPdf({
  reservation,
  customer,
  companyInfo,
  meetingPoints,
  ticketTerms,
}: {
  reservation: ReservationRow;
  customer: { full_name: string; phone: string | null; email: string | null };
  companyInfo: CompanyInfo;
  meetingPoints: MeetingPoints;
  ticketTerms: TicketTerms;
}): Promise<GenerateTicketPdfResult> {
  const qrDataUrl = await generateTicketQrDataUrl(
    `${window.location.origin}/reservaciones/${reservation.id}`,
  );
  const data = ticketDataFromReservation(reservation, customer);

  const blob = await pdf(
    <TicketDocument
      data={data}
      qrDataUrl={qrDataUrl}
      companyInfo={companyInfo}
      meetingPoints={meetingPoints}
      ticketTerms={ticketTerms}
    />,
  ).toBlob();

  const { count } = await supabase
    .from("ticket_files")
    .select("id", { count: "exact", head: true })
    .eq("reservation_id", reservation.id);
  const version = (count ?? 0) + 1;
  const storagePath = `${reservation.folio}/v${version}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("tickets")
    .upload(storagePath, blob, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("ticket_files").insert({
    reservation_id: reservation.id,
    storage_path: storagePath,
    version,
    generated_by: userData.user?.id ?? null,
  });

  const { data: signed } = await supabase.storage
    .from("tickets")
    .createSignedUrl(storagePath, 60 * 60);

  return { blob, storagePath, signedUrl: signed?.signedUrl ?? null, version };
}

/**
 * Devuelve la URL firmada del PDF más reciente ya generado para la reservación;
 * si todavía no existe ninguno, lo genera y lo sube en ese momento.
 */
export async function getOrCreateTicketPdfUrl({
  reservation,
  customer,
  companyInfo,
  meetingPoints,
  ticketTerms,
}: {
  reservation: ReservationRow;
  customer: { full_name: string; phone: string | null; email: string | null };
  companyInfo: CompanyInfo;
  meetingPoints: MeetingPoints;
  ticketTerms: TicketTerms;
}): Promise<string> {
  const { data: existing } = await supabase
    .from("ticket_files")
    .select("storage_path")
    .eq("reservation_id", reservation.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.storage_path) {
    const { data: signed } = await supabase.storage
      .from("tickets")
      .createSignedUrl(existing.storage_path, 60 * 60);
    if (signed?.signedUrl) return signed.signedUrl;
  }

  const { signedUrl } = await generateAndStoreTicketPdf({
    reservation,
    customer,
    companyInfo,
    meetingPoints,
    ticketTerms,
  });
  if (!signedUrl) throw new Error("No se pudo generar la URL del PDF");
  return signedUrl;
}
