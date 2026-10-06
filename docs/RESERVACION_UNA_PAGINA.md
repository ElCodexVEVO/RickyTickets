# Nueva reservación en una sola página

Refactorización de octubre de 2026. Sustituye el formulario de seis pasos (Cliente → Servicio → Vuelo → Transporte → Pago → Confirmar) y el panel lateral que lo incrustaba por una sola vista con resumen en tiempo real. Elimina del frontend la gestión de conductores y vehículos. Mantiene la identidad visual: tokens de `src/styles/index.css`, `Card`, `.panel-heading`, `Button`, `Field`, `Badge` y `StatusBadge`.

## Pantalla

`/ticket/nuevo` y `/reservaciones/:id/editar` usan el mismo editor (`src/components/tickets/ReservationEditor.tsx`):

| Sección           | Contenido                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Cliente         | Búsqueda por nombre, teléfono o correo (teclado ↑ ↓ Enter Esc). Nombre, teléfono con país/prefijo, correo y pasajeros `[-] n [+]`. Un cliente nuevo se registra al guardar.                   |
| 2 Servicio y ruta | Servicios del catálogo (`service_catalog_items`), Solo ida / Ida y regreso, recogida, destino, fecha y hora. El regreso invierte la ida hasta que el operador escribe otro punto.             |
| Regreso           | Recogida, destino, fecha (obligatoria) y hora. «Por determinar» desactiva y vacía la hora: se guarda `return_time = NULL`, sin 00:00.                                                         |
| 3 Vuelo           | Opcional con interruptor. Aerolínea (con sugerencias), número, fecha (propone la de ida) y hora; vuelo de regreso en ida y regreso. Desactivarlo descarta lo escrito al guardar.              |
| 4 Hotel           | Opcional: nombre y habitación.                                                                                                                                                                |
| 5 Pago            | Total, moneda, método, anticipo. Restante = total − anticipo (mínimo 0). Estado: anticipo 0 → Pendiente; menor que el total → Anticipo; igual o mayor → Pagado.                               |
| 6 Notas           | Opcional.                                                                                                                                                                                     |
| Resumen           | Sticky en escritorio (≈73/27 %), debajo del formulario en tablet y móvil. Cada bloque tiene «Editar», que enfoca la sección. Logo de la aerolínea, «Por determinar» y estado de pago en vivo. |

Botones (al pie del resumen): **Guardar borrador** y **Guardar y generar PDF**; en una reservación ya confirmada, **Guardar cambios** sustituye al borrador. Enter dentro de un campo no envía el formulario. No se usan `alert()`.

- **Borrador**: exige cliente, teléfono, ruta, fecha y hora de ida (columnas NOT NULL); el resto puede faltar. No genera PDF, no cuenta como servicio del cliente y no aparece en agenda, mapa, despacho, alertas, reportes ni en el QR público. Se continúa desde Reservaciones, el dashboard («Borradores») o el detalle.
- **Guardar y generar PDF**: exige además precio y, en ida y regreso, recogida, destino, fecha y hora o «Por determinar». Un borrador completado pasa a «Pendiente».
- Lo escrito y no guardado en `/ticket/nuevo` se conserva durante la sesión de la pestaña (`sessionStorage`), como hacía el panel lateral. «Limpiar» lo descarta.
- En una reservación existente los datos de contacto del cliente se muestran en solo lectura, igual que antes.
- Quien crea un borrador puede continuarlo y completarlo aunque no tenga permiso general de edición.

## Migración 0008

`supabase/migrations/0008_single_page_reservations.sql`. **Preparada y probada en PostgreSQL aislado (PGlite); no se aplicó a la base real.** Aplícala después de 0005, 0006 y 0007, con respaldo previo y prueba en una copia.

- Añade el estado `draft` a `reservation_status` (fuera de la transacción; nada en el archivo lo usa como valor de enum).
- Añade `reservations.deposit numeric(12,2)` (≥ 0; `NULL` = reservación anterior sin registro, no se interpreta como 0) y `reservations.flight_time time`.
- Reescribe `create_reservation_base` (creada en 0006 a partir de 0001): misma búsqueda de cliente, folio y actividad, más estado inicial, anticipo y hora de vuelo en un solo INSERT. Ya no lee `vehicle_id` ni `driver_id`.
- `sync_customer_stats`: los borradores cuentan como servicio al completarse, no al crearse.
- `log_reservation_changes` registra también `deposit` y `flight_time`.
- Política `reservations_update_own_draft`: el autor de un borrador puede editarlo y pasarlo a `pending`.
- `get_public_ticket` excluye borradores.
- Comentarios `obsoleto` en `vehicles`, `drivers`, `reservations.vehicle_id` y `reservations.driver_id`. No elimina nada.

Sin 0008 la aplicación sigue funcionando: detecta las columnas (`getQuickReservationSupport`) y desactiva «Guardar borrador», anticipo y hora del vuelo con el aviso «Disponible al aplicar la migración 0008».

## Conductores y vehículos

Eliminados del frontend: páginas `/conductores` y `/vehiculos`, sus enlaces del Directorio, `features/drivers`, `features/vehicles`, `VehicleDriverSelect`, advertencias de asignación, alertas «Sin conductor/Sin vehículo/Mantenimiento», columnas de la tabla y del CSV, desgloses de reportes, resultados del buscador global, tarjeta del dashboard y filtros/leyenda «Sin asignar» del mapa (ahora «Por confirmar»). Las consultas ya no hacen join a `vehicles` ni `drivers`. Las reservaciones antiguas con conductor o vehículo se abren y editan con normalidad: esas columnas se ignoran y la actividad histórica las rotula «(histórico)».

### Retiro posterior (no aplicado)

Siguen en la base y no bloquean nada (las columnas de reservaciones son opcionales). Cuando ya no se necesite el historial, se pueden retirar con una migración nueva tras respaldo y exportación:

| Objeto                                                                             | Dependencias a revisar                                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `reservations.vehicle_id`, `reservations.driver_id` e índices `reservations_*_idx` | FKs a `vehicles`/`drivers`; lista de `log_reservation_changes` (0008).                                  |
| Tabla `drivers`                                                                    | FK `drivers.vehicle_id`, trigger `trg_drivers_updated_at`, políticas `drivers_*` y `active_staff_only`. |
| Tabla `vehicles`                                                                   | FKs anteriores, trigger `trg_vehicles_updated_at`, políticas `vehicles_*` y `active_staff_only`.        |
| Enums `vehicle_type`, `vehicle_status`, `driver_status`                            | Solo los usan esas tablas.                                                                              |
| Bucket `fleet-photos` y sus políticas                                              | Fotos existentes: descargarlas antes; política `active_staff_storage` (0005).                           |

Borrador de esa migración futura (revisar antes de usar):

```sql
-- 0009_drop_fleet.sql (NO incluida). Ejecutar solo con respaldo y exportación previa.
begin;
create table if not exists public.fleet_archive as
  select r.id as reservation_id, r.folio, r.vehicle_id, r.driver_id
  from public.reservations r where r.vehicle_id is not null or r.driver_id is not null;
drop index if exists public.reservations_vehicle_idx;
drop index if exists public.reservations_driver_idx;
alter table public.reservations drop column vehicle_id, drop column driver_id;
drop table public.drivers;
drop table public.vehicles;
drop type public.driver_status;
drop type public.vehicle_status;
drop type public.vehicle_type;
commit;
-- log_reservation_changes debe recrearse sin driver_id/vehicle_id en la lista.
-- El bucket fleet-photos se vacía y elimina desde Storage, no con SQL directo.
```

## PDF

Sin conductor, vehículo ni asignaciones. Incluye folio, cliente, servicio del catálogo, recogida y destino, hotel/habitación, pasajeros, ida, vuelo (aerolínea, número, fecha y hora), regreso, notas, precio, anticipo, restante, método, estado de la reservación, estado de pago y QR. Con hora pendiente muestra «Hora de regreso: Por determinar». Las reservaciones anteriores a 0008 muestran solo el precio (sin inventar anticipo). La flecha «→» del catálogo se escribe «->» porque Helvetica no la incluye. Un borrador no genera PDF.

## Assets

`public/assets/rickytickets/` (copiados a `dist/assets/rickytickets/` en el build; Vercel sirve archivos estáticos antes del rewrite a `index.html`). Las rutas usan `import.meta.env.BASE_URL` (`src/lib/assets.ts`).

- Iconos de servicio, pago, estado y UI del pack; se pintan con `mask` para heredar el color del tema (`AssetIcon`).
- Logos de aerolíneas: SVG originales de Wikimedia Commons, sin modificar, nombrados según `src/data/airlines.json`. Se muestran en el resumen cuando la aerolínea coincide con nombre, IATA o alias (o con el prefijo IATA del número de vuelo); si no, `placeholders/airline-placeholder.svg`. Son marcas de sus titulares: solo identifican la compañía.
- Banderas del teléfono: `country-flag-icons` (MIT, SVG; solo se empaquetan los 11 países de `src/data/countries.json`). El número se guarda como texto `+52 999 123 4567`; los teléfonos históricos sin prefijo se conservan tal cual.

## Verificación

`npm run lint`, `npm run typecheck`, `npm test` (56 pruebas) y `npm run build` sin errores. Cobertura de los casos solicitados:

| Caso                                    | Dónde                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| 1 Solo ida con hora                     | `tests/reservationForm.test.tsx` · un envío final y un PDF                            |
| 2 Ida y regreso con horas               | idem · ruta invertida, hora requerida                                                 |
| 3 Regreso «Por determinar»              | idem · hora desactivada, `NULL` en payload; PDF en `tests/ticketPdf.test.tsx`         |
| 4–7 Con/sin vuelo y hotel               | idem · logo de aerolínea, vuelo desactivado descarta datos                            |
| 8–10 Pago pendiente, anticipo, pagado   | idem y `tests/operations.test.ts` (`paymentSummary`)                                  |
| 11 Guardar borrador                     | idem y `tests/migrations.test.ts` (estado, estadísticas, QR, política del autor)      |
| 12 Guardar y generar PDF                | idem · PDF de una página con todos los datos (`tests/ticketPdf.test.tsx`)             |
| 13 Reabrir y editar                     | idem · borrador antiguo completado a pendiente; solo lectura sin permiso              |
| 14 Directorio sin conductores/vehículos | `Sidebar` y `AppRouter`; búsqueda de referencias en `src`                             |
| 15 Sin dependencia de flota             | payloads sin `vehicle_id/driver_id`; `create_reservation` en PGlite deja ambos `NULL` |

La interfaz se revisó en un arnés local con sesión y datos simulados (sin acceso a Supabase): móvil 424 px y anchos 768, 1024, 1280, 1440 y 1920 px sin desplazamiento horizontal.
