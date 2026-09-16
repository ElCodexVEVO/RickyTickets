import { z } from "zod";

export const reservationFormSchema = z
  .object({
    customer_full_name: z.string().trim().min(2, "Escribe el nombre completo"),
    customer_phone: z.string().trim().min(7, "Escribe un teléfono válido"),
    customer_email: z.union([z.string().trim().email("Correo inválido"), z.literal("")]).optional(),

    passengers: z.number().int().min(1, "Mínimo 1 persona").max(60, "Verifica el número de personas"),
    service_type: z.enum(["sencillo", "redondo"]),

    pickup_point: z.string().trim().min(1, "Requerido"),
    dropoff_point: z.string().trim().min(1, "Requerido"),
    hotel: z.string().trim().optional(),
    room: z.string().trim().optional(),

    date: z.string().min(1, "Requerido"),
    time: z.string().min(1, "Requerido"),

    airline: z.string().trim().optional(),
    flight_number: z.string().trim().optional(),
    flight_date: z.string().optional(),

    return_date: z.string().optional(),
    return_time: z.string().optional(),
    return_pickup_point: z.string().trim().optional(),
    return_dropoff_point: z.string().trim().optional(),
    return_airline: z.string().trim().optional(),
    return_flight_number: z.string().trim().optional(),

    price: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || !Number.isNaN(Number(v)), "Precio inválido")
      .refine((v) => !v || Number(v) >= 0, "El precio no puede ser negativo"),
    currency: z.enum(["USD", "MXN"]),
    payment_method: z.string().trim().optional(),
    notes: z.string().trim().optional(),

    vehicle_id: z.string().uuid().optional().or(z.literal("")),
    driver_id: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.service_type === "redondo") {
      const requiredReturnFields: Array<[keyof typeof data, string]> = [
        ["return_date", "Fecha de regreso requerida"],
        ["return_time", "Hora de regreso requerida"],
        ["return_pickup_point", "Punto de recogida de regreso requerido"],
        ["return_dropoff_point", "Destino de regreso requerido"],
      ];
      for (const [field, message] of requiredReturnFields) {
        if (!data[field]) {
          ctx.addIssue({ code: "custom", path: [field], message });
        }
      }
    }
  });

export type ReservationFormValues = z.infer<typeof reservationFormSchema>;

export const reservationFormDefaults: ReservationFormValues = {
  customer_full_name: "",
  customer_phone: "",
  customer_email: "",
  passengers: 1,
  service_type: "sencillo",
  pickup_point: "",
  dropoff_point: "",
  hotel: "",
  room: "",
  date: "",
  time: "",
  airline: "",
  flight_number: "",
  flight_date: "",
  return_date: "",
  return_time: "",
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
