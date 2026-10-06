import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabaseClient";
import { TicketDocument } from "@/pdf/TicketDocument";
import { generateTicketQrDataUrl } from "@/pdf/qr";
import { ticketDataFromReservation } from "@/pdf/buildTicketData";
import type { ReservationRow } from "@/types/database.types";
import type {
  CompanyInfo,
  MeetingPoints,
  TicketTerms,
} from "@/features/settings/hooks";

export interface GenerateTicketPdfResult {
  blob: Blob;
  storagePath: string;
  signedUrl: string | null;
  version: number;
}

export async function generateAndStoreTicketPdf({
  reservation,
  customer,
  serviceLabel,
  companyInfo,
  meetingPoints,
  ticketTerms,
}: {
  reservation: ReservationRow;
  customer: { full_name: string; phone: string | null; email: string | null };
  serviceLabel?: string;
  companyInfo: CompanyInfo;
  meetingPoints: MeetingPoints;
  ticketTerms: TicketTerms;
}): Promise<GenerateTicketPdfResult> {
  const qrDataUrl = await generateTicketQrDataUrl(
    `${window.location.origin}/verificar/${reservation.id}`,
  );
  const data = ticketDataFromReservation(reservation, customer, serviceLabel);

  const blob = await pdf(
    <TicketDocument
      data={data}
      qrDataUrl={qrDataUrl}
      companyInfo={companyInfo}
      meetingPoints={meetingPoints}
      ticketTerms={ticketTerms}
    />,
  ).toBlob();

  const { data: latest, error: versionError } = await supabase
    .from("ticket_files")
    .select("version")
    .eq("reservation_id", reservation.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (versionError) throw versionError;
  const version = (latest?.version ?? 0) + 1;
  // UUID impide sobrescribir PDFs históricos incluso con dos operadores simultáneos.
  const storagePath = `${reservation.folio}/${crypto.randomUUID()}/v${version}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("tickets")
    .upload(storagePath, blob, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();
  const { error: fileError } = await supabase.from("ticket_files").insert({
    reservation_id: reservation.id,
    storage_path: storagePath,
    version,
    generated_by: userData.user?.id ?? null,
  });
  if (fileError) throw fileError;

  const { data: signed, error: signedError } = await supabase.storage
    .from("tickets")
    .createSignedUrl(storagePath, 60 * 60);
  if (signedError) throw signedError;

  return { blob, storagePath, signedUrl: signed?.signedUrl ?? null, version };
}
