import QRCode from "qrcode";

export async function generateTicketQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    margin: 1,
    width: 240,
    color: {
      dark: "#18161A",
      light: "#00000000",
    },
  });
}
