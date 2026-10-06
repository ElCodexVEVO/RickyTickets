import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import type { TicketData } from "@/types/domain";
import type {
  CompanyInfo,
  MeetingPoints,
  TicketTerms,
} from "@/features/settings/hooks";
import { colors, ticketStyles as s } from "@/pdf/ticketStyles";
import { formatCurrency, formatTicketDate, formatTime } from "@/lib/format";
import logoUrl from "@/assets/logo.png";
import { returnTimeLabel } from "@/lib/operations";
import {
  paymentStatusLabelsEn,
  paymentSummary,
  type PaymentStatus,
} from "@/lib/payments";

const STATUS_LABEL: Record<TicketData["status"], string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<TicketData["status"], { bg: string; fg: string }> = {
  draft: { bg: colors.neutralBg, fg: colors.inkDim },
  pending: { bg: colors.pendingBg, fg: colors.pending },
  confirmed: { bg: colors.positiveBg, fg: colors.positive },
  in_service: { bg: "#F3E9D2", fg: "#816323" },
  completed: { bg: colors.positiveBg, fg: colors.positive },
  cancelled: { bg: colors.neutralBg, fg: colors.inkDim },
};

const PAYMENT_COLOR: Record<PaymentStatus, { bg: string; fg: string }> = {
  pending: { bg: colors.pendingBg, fg: colors.pending },
  partial: { bg: "#F3E9D2", fg: "#816323" },
  paid: { bg: colors.positiveBg, fg: colors.positive },
};

// Helvetica (WinAnsi) no incluye «→», presente en etiquetas del catálogo.
export function pdfText(value: string) {
  return value.replace(/→/g, "->");
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{pdfText(value) || "-"}</Text>
    </View>
  );
}

export function TicketDocument({
  data,
  qrDataUrl,
  companyInfo,
  meetingPoints,
  ticketTerms,
  logoSrc = logoUrl,
}: {
  data: TicketData;
  qrDataUrl: string;
  companyInfo: CompanyInfo;
  meetingPoints: MeetingPoints;
  ticketTerms: TicketTerms;
  logoSrc?: string;
}) {
  const statusColor = STATUS_COLOR[data.status];
  const money = (amount: number | null) =>
    amount == null
      ? "To be confirmed"
      : `${formatCurrency(amount, data.currency)} ${data.currency}`;
  // Reservaciones anteriores a 0008 no tienen registro de anticipo: solo precio.
  const payment =
    data.deposit === undefined
      ? undefined
      : paymentSummary(data.price, data.deposit);
  const flight = [
    data.airline,
    data.flightNumber,
    data.flightDate && formatTicketDate(data.flightDate, "d MMM yyyy"),
    data.flightTime && formatTime(data.flightTime),
  ]
    .filter(Boolean)
    .join(" · ");
  const lodging = [data.hotel, data.room && `Room ${data.room}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Document title={`Ticket ${data.folio} · ${companyInfo.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Image src={logoSrc} style={s.logoImage} />
            <View>
              <Text style={s.brandName}>{companyInfo.name.toUpperCase()}</Text>
              <Text style={s.brandTagline}>{companyInfo.tagline}</Text>
              <Text style={s.brandSub}>
                TRASLADOS PRIVADOS · AEROPUERTOS · TOURS
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.folioLabel}>FOLIO</Text>
            <Text style={s.folioValue}>{data.folio}</Text>
          </View>
        </View>

        <View style={s.body}>
          <InfoRow label="Name" value={data.customerName} />
          {data.serviceLabel && (
            <InfoRow label="Service" value={data.serviceLabel} />
          )}
          <InfoRow label="Pick Up" value={data.pickupPoint} />
          <InfoRow label="Drop Off" value={data.dropoffPoint} />
          {lodging && <InfoRow label="Hotel / Room" value={lodging} />}
          <InfoRow label="Number of People" value={String(data.passengers)} />
          <InfoRow
            label="Date"
            value={formatTicketDate(data.date, "EEEE, MMMM d, yyyy")}
          />
          <InfoRow label="Hour" value={formatTime(data.time)} />
          <InfoRow
            label="Phone Number, Email"
            value={[data.phone, data.email].filter(Boolean).join(" · ")}
          />
          {flight && <InfoRow label="Flight" value={flight} />}

          {data.serviceType === "redondo" && (
            <>
              <Text style={s.sectionTitle}>Return Information</Text>
              <InfoRow
                label="Return Date / Route"
                value={[
                  formatTicketDate(data.returnDate, "d MMM yyyy"),
                  [data.returnPickupPoint, data.returnDropoffPoint]
                    .filter(Boolean)
                    .join(" -> "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <InfoRow
                label="Hora de regreso"
                value={returnTimeLabel(data.returnTime)}
              />
              {(data.returnAirline || data.returnFlightNumber) && (
                <InfoRow
                  label="Return Airline/Flight"
                  value={[data.returnAirline, data.returnFlightNumber]
                    .filter(Boolean)
                    .join(" · ")}
                />
              )}
            </>
          )}

          {data.notes && (
            <>
              <Text style={s.sectionTitle}>Notes</Text>
              <Text style={s.notes}>{pdfText(data.notes)}</Text>
            </>
          )}

          <View style={s.priceBlock}>
            <View>
              <Text style={s.priceLabel}>Price</Text>
              <Text style={s.priceValue}>{money(data.price ?? null)}</Text>
              {payment && (
                <View style={s.paymentRows}>
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>Deposit</Text>
                    <Text style={s.paymentValue}>{money(payment.deposit)}</Text>
                  </View>
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>Balance due</Text>
                    <Text style={s.paymentValue}>
                      {money(payment.remaining)}
                    </Text>
                  </View>
                  {data.paymentMethod && (
                    <View style={s.paymentRow}>
                      <Text style={s.paymentLabel}>Payment method</Text>
                      <Text style={s.paymentValue}>
                        {pdfText(data.paymentMethod)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <View style={s.pills}>
                <View
                  style={[s.statusPill, { backgroundColor: statusColor.bg }]}
                >
                  <Text style={[s.statusPillText, { color: statusColor.fg }]}>
                    {STATUS_LABEL[data.status]}
                  </Text>
                </View>
                {payment && (
                  <View
                    style={[
                      s.statusPill,
                      { backgroundColor: PAYMENT_COLOR[payment.status].bg },
                    ]}
                  >
                    <Text
                      style={[
                        s.statusPillText,
                        { color: PAYMENT_COLOR[payment.status].fg },
                      ]}
                    >
                      {paymentStatusLabelsEn[payment.status]}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={s.thankYou}>Thank you!</Text>
            </View>
            {qrDataUrl && <Image src={qrDataUrl} style={s.qrImage} />}
          </View>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTitle}>Meeting Point Tulum Airport</Text>
          <Text style={s.footerText}>{meetingPoints.tulum_airport}</Text>
          <Text style={s.footerTitle}>Meeting Point Cancún Airport</Text>
          <Text style={s.footerText}>{meetingPoints.cancun_airport}</Text>
          <Text style={s.footerText}>{ticketTerms.text}</Text>
          <View style={s.footerBottom}>
            <Text style={s.footerContact}>
              {companyInfo.phone} · {companyInfo.instagram}
            </Text>
            <Text style={s.footerBrand}>DANNY TRANSFERS · TULUM, MÉXICO</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
