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

const STATUS_LABEL: Record<TicketData["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<TicketData["status"], { bg: string; fg: string }> = {
  pending: { bg: colors.pendingBg, fg: colors.pending },
  confirmed: { bg: colors.positiveBg, fg: colors.positive },
  in_service: { bg: "#F3E9D2", fg: "#816323" },
  completed: { bg: colors.positiveBg, fg: colors.positive },
  cancelled: { bg: colors.neutralBg, fg: colors.inkDim },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || "-"}</Text>
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
          <InfoRow label="Pick Up" value={data.pickupPoint} />
          <InfoRow label="Room" value={data.room ?? ""} />
          <InfoRow label="Drop Off" value={data.dropoffPoint} />
          {data.hotel && <InfoRow label="Hotel" value={data.hotel} />}
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
          <InfoRow
            label="Airline/Flight Number"
            value={[data.airline, data.flightNumber]
              .filter(Boolean)
              .join(" · ")}
          />

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

          <View style={s.priceBlock}>
            <View>
              <Text style={s.priceLabel}>Price</Text>
              <Text style={s.priceValue}>
                {data.price != null
                  ? `${formatCurrency(data.price, data.currency)} ${data.currency}`
                  : "To be confirmed"}
              </Text>
              <View style={[s.statusPill, { backgroundColor: statusColor.bg }]}>
                <Text style={[s.statusPillText, { color: statusColor.fg }]}>
                  {STATUS_LABEL[data.status]}
                </Text>
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
