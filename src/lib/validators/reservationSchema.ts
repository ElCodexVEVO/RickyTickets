import { z } from "zod";
import { DEFAULT_PHONE_COUNTRY } from "@/lib/phone";

const latitude = z.number().finite().min(-90).max(90).nullable().optional();
const longitude = z.number().finite().min(-180).max(180).nullable().optional();
const address = z.string().trim().max(1000).nullable().optional();
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const amount = (label: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || Number.isFinite(Number(v)), `${label} inválido`)
    .refine((v) => !v || Number(v) >= 0, `${label} no puede ser negativo`);

const reservationShape = z.object({
  customer_full_name: z.string().trim().min(2, "Escribe el nombre completo"),
  // Número local; el prefijo del país se guarda junto al número (ver lib/phone).
  customer_phone: z
    .string()
    .trim()
    .refine(
      (v) => v.replace(/\D/g, "").length >= 7,
      "Escribe un teléfono válido",
    ),
  phone_country: z.string(),
  customer_email: z
    .union([z.string().trim().email("Correo inválido"), z.literal("")])
    .optional(),

  passengers: z
    .number({ error: "Indica el número de pasajeros" })
    .int()
    .min(1, "Mínimo 1 persona")
    .max(60, "Verifica el número de personas"),
  service_type: z.enum(["sencillo", "redondo"]),
  service_catalog_item_id: z.string().uuid().optional().or(z.literal("")),

  pickup_point: z.string().trim().min(1, "Punto de recogida requerido"),
  dropoff_point: z.string().trim().min(1, "Destino requerido"),
  origin_lat: latitude,
  origin_lng: longitude,
  origin_address: address,
  destination_lat: latitude,
  destination_lng: longitude,
  destination_address: address,
  return_origin_lat: latitude,
  return_origin_lng: longitude,
  return_origin_address: address,
  return_destination_lat: latitude,
  return_destination_lng: longitude,
  return_destination_address: address,
  hotel: z.string().trim().optional(),
  room: z.string().trim().optional(),

  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha requerida"),
  time: z.string().regex(TIME, "Hora requerida"),

  include_flight: z.boolean(),
  airline: z.string().trim().optional(),
  flight_number: z.string().trim().optional(),
  flight_date: z.string().optional(),
  flight_time: z
    .string()
    .optional()
    .refine((v) => !v || TIME.test(v), "Hora inválida"),

  return_date: z.string().optional(),
  return_time: z.string().optional(),
  return_time_pending: z.boolean(),
  return_pickup_point: z.string().trim().optional(),
  return_dropoff_point: z.string().trim().optional(),
  return_airline: z.string().trim().optional(),
  return_flight_number: z.string().trim().optional(),

  price: amount("Precio"),
  deposit: amount("Anticipo"),
  currency: z.enum(["USD", "MXN"]),
  payment_method: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type ReservationFormValues = z.infer<typeof reservationShape>;
export type SaveIntent = "draft" | "final";

// Un borrador solo exige lo que la base necesita para crear la fila (cliente, ruta,
// fecha y hora de ida). Guardar y generar PDF exige además precio y regreso completo.
function refineReservation(intent: SaveIntent) {
  return (data: ReservationFormValues, ctx: z.RefinementCtx) => {
    const issue = (path: keyof ReservationFormValues, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });
    for (const prefix of [
      "origin",
      "destination",
      "return_origin",
      "return_destination",
    ] as const) {
      if (prefix.startsWith("return_") && data.service_type !== "redondo")
        continue;
      if ((data[`${prefix}_lat`] == null) !== (data[`${prefix}_lng`] == null))
        issue(`${prefix}_lat`, "Confirma ambos valores de ubicación");
    }
    if (intent === "final" && !data.price) issue("price", "Precio requerido");
    if (data.service_type !== "redondo") return;
    if (intent === "final") {
      if (!data.return_pickup_point)
        issue("return_pickup_point", "Punto de recogida de regreso requerido");
      if (!data.return_dropoff_point)
        issue("return_dropoff_point", "Destino de regreso requerido");
      if (!data.return_date) issue("return_date", "Fecha de regreso requerida");
      if (!data.return_time_pending && !TIME.test(data.return_time ?? ""))
        issue("return_time", "Selecciona una hora o activa Por determinar");
    } else if (
      !data.return_time_pending &&
      data.return_time &&
      !TIME.test(data.return_time)
    )
      issue("return_time", "Hora inválida");
    if (data.return_date && data.return_date < data.date)
      issue("return_date", "El regreso no puede ser anterior a la ida");
    if (
      !data.return_time_pending &&
      data.return_date === data.date &&
      data.return_time &&
      data.return_time < data.time
    )
      issue("return_time", "El regreso no puede ser anterior a la ida");
  };
}

export const reservationFormSchema = reservationShape.superRefine(
  refineReservation("final"),
);
export const reservationDraftSchema = reservationShape.superRefine(
  refineReservation("draft"),
);

// El editor no modifica datos del cliente: admite contactos históricos incompletos.
const editShape = reservationShape.extend({
  customer_full_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().optional(),
});
export const reservationEditSchema = editShape.superRefine(
  refineReservation("final"),
);
export const reservationEditDraftSchema = editShape.superRefine(
  refineReservation("draft"),
);

export function reservationSchemaFor(intent: SaveIntent, editing: boolean) {
  if (editing)
    return intent === "draft"
      ? reservationEditDraftSchema
      : reservationEditSchema;
  return intent === "draft" ? reservationDraftSchema : reservationFormSchema;
}

export const reservationFormDefaults: ReservationFormValues = {
  customer_full_name: "",
  customer_phone: "",
  phone_country: DEFAULT_PHONE_COUNTRY,
  customer_email: "",
  passengers: 1,
  service_type: "sencillo",
  service_catalog_item_id: "",
  pickup_point: "",
  dropoff_point: "",
  origin_lat: null,
  origin_lng: null,
  origin_address: null,
  destination_lat: null,
  destination_lng: null,
  destination_address: null,
  return_origin_lat: null,
  return_origin_lng: null,
  return_origin_address: null,
  return_destination_lat: null,
  return_destination_lng: null,
  return_destination_address: null,
  hotel: "",
  room: "",
  date: "",
  time: "",
  include_flight: false,
  airline: "",
  flight_number: "",
  flight_date: "",
  flight_time: "",
  return_date: "",
  return_time: "",
  return_time_pending: false,
  return_pickup_point: "",
  return_dropoff_point: "",
  return_airline: "",
  return_flight_number: "",
  price: "",
  deposit: "",
  currency: "USD",
  payment_method: "",
  notes: "",
};
