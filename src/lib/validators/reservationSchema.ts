import { z } from "zod";
const latitude = z.number().finite().min(-90).max(90).nullable().optional();
const longitude = z.number().finite().min(-180).max(180).nullable().optional();
const address = z.string().trim().max(1000).nullable().optional();

export const reservationFormSchema = z
  .object({
    customer_full_name: z.string().trim().min(2, "Escribe el nombre completo"),
    customer_phone: z.string().trim().min(7, "Escribe un teléfono válido"),
    customer_email: z
      .union([z.string().trim().email("Correo inválido"), z.literal("")])
      .optional(),

    passengers: z
      .number()
      .int()
      .min(1, "Mínimo 1 persona")
      .max(60, "Verifica el número de personas"),
    service_type: z.enum(["sencillo", "redondo"]),
    service_catalog_item_id: z.string().uuid().optional().or(z.literal("")),

    pickup_point: z.string().trim().min(1, "Requerido"),
    dropoff_point: z.string().trim().min(1, "Requerido"),
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
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Hora válida requerida"),

    airline: z.string().trim().optional(),
    flight_number: z.string().trim().optional(),
    flight_date: z.string().optional(),

    return_date: z.string().optional(),
    return_time: z.string().optional(),
    return_time_pending: z.boolean(),
    return_pickup_point: z.string().trim().optional(),
    return_dropoff_point: z.string().trim().optional(),
    return_airline: z.string().trim().optional(),
    return_flight_number: z.string().trim().optional(),

    price: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || Number.isFinite(Number(v)), "Precio inválido")
      .refine((v) => !v || Number(v) >= 0, "El precio no puede ser negativo"),
    currency: z.enum(["USD", "MXN"]),
    payment_method: z.string().trim().optional(),
    notes: z.string().trim().optional(),

    vehicle_id: z.string().uuid().optional().or(z.literal("")),
    driver_id: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    for (const prefix of ["origin", "destination", "return_origin", "return_destination"] as const) {
      if (prefix.startsWith("return_") && data.service_type !== "redondo") continue;
      if ((data[`${prefix}_lat`] == null) !== (data[`${prefix}_lng`] == null))
        ctx.addIssue({ code: "custom", path: [`${prefix}_lat`], message: "Confirma ambos valores de ubicación" });
    }
    if (data.service_type === "redondo") {
      const requiredReturnFields: Array<[keyof typeof data, string]> = [
        ["return_date", "Fecha de regreso requerida"],
        ["return_pickup_point", "Punto de recogida de regreso requerido"],
        ["return_dropoff_point", "Destino de regreso requerido"],
      ];
      for (const [field, message] of requiredReturnFields) {
        if (!data[field]) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      }
      if (
        !data.return_time_pending &&
        !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(data.return_time ?? "")
      )
        ctx.addIssue({
          code: "custom",
          path: ["return_time"],
          message: "Selecciona una hora o activa Por determinar",
        });
      if (data.return_date && data.return_date < data.date)
        ctx.addIssue({
          code: "custom",
          path: ["return_date"],
          message: "El regreso no puede ser anterior a la ida",
        });
      if (
        !data.return_time_pending &&
        data.return_date === data.date &&
        data.return_time &&
        data.return_time < data.time
      )
        ctx.addIssue({
          code: "custom",
          path: ["return_time"],
          message: "El regreso no puede ser anterior a la ida",
        });
    }
  });

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;
// El editor no modifica datos del cliente: admite contactos históricos incompletos.
export const reservationEditSchema = reservationFormSchema.safeExtend({
  customer_full_name: z.string(),
  customer_phone: z.string(),
  customer_email: z.string().optional(),
});

export const reservationFormDefaults: ReservationFormValues = {
  customer_full_name: "",
  customer_phone: "",
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
  airline: "",
  flight_number: "",
  flight_date: "",
  return_date: "",
  return_time: "",
  return_time_pending: false,
  return_pickup_point: "",
  return_dropoff_point: "",
  return_airline: "",
  return_flight_number: "",
  price: "",
  currency: "USD",
  payment_method: "",
  notes: "",
  vehicle_id: "",
  driver_id: "",
};
