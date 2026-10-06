# Entrega técnica · RickyTickets V2

Trabajo sobre el checkout existente de Danny Transfers, tras la auditoría documentada en `AUDITORIA.md`. React, TypeScript estricto, Supabase, rutas previas, CRUD, PDF, QR y funcionalidades anteriores se conservan. Las dos imágenes proporcionadas guiaron el sistema visual carbón/azulado, dorado discreto y superficies compactas.

## 1. Archivos modificados

El inventario completo al final distingue archivos modificados y añadidos. Los cambios se concentran en layout, componentes reutilizables, páginas, datos de reservaciones, autenticación, tipos y generación PDF. También se actualizaron dependencias, scripts y README.

Se preservaron los cambios locales que existían antes de empezar: `.gitignore`, cliente Supabase, hooks de reservaciones, generador PDF, router, módulo público, migración 0004 y `vercel.json`. Que aparezcan en el inventario no implica que todos se hayan creado en esta intervención.

## 2. Archivos creados

Se añadieron componentes de operación, agenda, actividad, versiones de ticket, cancelación y WhatsApp; utilidades compartidas de operación/reportes/diálogos; hooks de actividad y catálogos; pruebas aisladas y documentación. El inventario enumera sus rutas exactas.

## 3. Migraciones

| Archivo                              | Cambio                                                                                                                         | Estado                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 0004_public_ticket_verification.sql  | RPC pública limitada para el QR; archivo local previo                                                                          | Conservada; RPC verificada en la base conectada             |
| 0005_staff_security_and_activity.sql | Restricciones para empleados activos, protección de RPC y perfiles, altas por metadatos confiables, registro de cambios reales | Preparada y probada en PGlite; **no aplicada a producción** |
| 0006_reservation_service_catalog.sql | FK opcional al catálogo y wrapper compatible de creación                                                                       | Preparada y probada en PGlite; **no aplicada a producción** |

No se necesita migración para el regreso pendiente: `return_time` ya era nullable. `return_time_pending` solo existe en el formulario y se transforma en `NULL`; nunca se persiste una hora artificial. 0005 añade políticas restrictivas que se combinan mediante AND con las políticas existentes. No elimina perfiles ni políticas anteriores. 0006 distingue servicio configurable de tipo de trayecto y no reescribe reservas históricas.

Para desplegar: respaldo, revisión de migraciones realmente aplicadas, prueba en copia de la base, aplicar 0005/0006 en orden, deshabilitar signup público en Auth y desplegar `create-employee`. Las instrucciones están en README. La integración real del alta de empleados con la Edge Function nueva queda pendiente de ese despliegue.

## 4. Funciones nuevas

- Navegación por Operación/Directorio/Gestión, sidebar colapsable con títulos accesibles, menú móvil y estado de conexión obtenido de Supabase.
- Buscador global por folio, contacto, vuelo, conductor, vehículo y rutas disponibles. Notificaciones y ayuda.
- Dashboard operativo: trayectos reales del día, asignaciones, mantenimiento, tablero con controles explícitos de estado y alertas. Módulo de mapa preparado sin coordenadas ficticias.
- Nueva reservación en seis pasos y preview compartido con los datos del ticket. Panel lateral conservado en memoria al cerrarlo; se limpia al recargar la aplicación o mediante Limpiar.
- Regreso pendiente en creación/edición, preview, tabla, dashboard, agenda, detalle, CSV, PDF, ticket público y actividad cuando el evento esté registrado.
- Agenda diaria/semanal/mensual, con regresos sin hora separados de los bloques horarios.
- Advertencias de capacidad, mantenimiento, inactividad, vehículo del conductor y asignaciones cercanas. La proximidad usa 120 minutos, configurable en la función compartida, y compara también entre días. No representa duración de viaje ni bloquea automáticamente casos reales.
- Catálogos editables para servicios, ubicaciones y métodos de pago. El catálogo de servicios de una reservación se habilita al aplicar 0006.
- Cancelación con motivo y comentario, reutilizando `reservation_status_history.note` y la RPC original.
- Actividad real del equipo y de la reservación; versiones PDF con fecha, usuario y acceso firmado.
- Siete borradores WhatsApp: confirmación, recordatorio, en camino, llegó, cambio de horario, ticket y meeting point. No se envían mensajes automáticamente.

## 5. Funciones existentes mejoradas

- Editor de reservación ampliado a trayectos, regreso, pasajeros, vuelo, transporte, precio, moneda, método y notas. Admite contactos históricos incompletos sin exigir editarlos.
- Preview muestra folio definitivo después de guardar y datos de conductor/vehículo; el PDF indica la moneda.
- Flota y conductores conservan CRUD/fotos y añaden asignaciones, servicios de hoy, próximo servicio y licencia existente.
- CRM con frecuencia derivada, notas e historial, y totales de servicios completados separados por moneda.
- Reportes con periodo/moneda, importes elegibles, promedio, estados/cancelaciones, rutas, conductores, vehículos, métodos y clientes nuevos/recurrentes.
- Exportación CSV con BOM y protección ante fórmulas; Excel puede abrir ese CSV. La exportación PDF de reportes usa impresión del navegador. No se genera un XLSX nativo.
- Carga diferida del generador PDF, estados de carga/error/vacío, diálogos con foco/ESC, movimiento reducido y estilos de impresión.
- Lectura paginada de reservaciones evita el truncamiento habitual de 1.000 filas de Supabase.

## 6. Bugs encontrados

- Sesión autenticada permitía renderizar módulos sin comprobar perfil activo; signup público y RLS demasiado amplia para un sistema de empleados.
- Regreso pendiente bloqueado por formulario/Zod aunque SQL ya admitía NULL; editor no permitía completar muchos campos después.
- Reportes y `total_spent` histórico mezclaban USD/MXN; no existía un registro real de cobros.
- Falta de comprobación de errores al subir/registrar PDF, posibilidad de sobreescribir rutas y ausencia de UI de versiones.
- Validación numérica incompleta, IDs repetidos al abrir más de un formulario y búsquedas que podían romper el filtro PostgREST con comillas.
- Hora de historial tomada del substring UTC en vez de formatear el timestamp completo.
- Durante QA, reutilizar el botón Siguiente como Submit al entrar a Confirmar produjo un envío involuntario. Se creó DT-2026-000056 y su cliente de prueba.
- El script previo ESLint no tenía configuración. El parser TypeScript disponible no soporta TypeScript 7; instalarlo sin forzar versiones produjo un conflicto de peer dependencies.
- Dependencia transitiva vulnerable y restricciones EPERM del sandbox Windows al resolver PDFKit.

## 7. Bugs corregidos y límites

- Perfil activo obligatorio y caché limpiada al salir; defensa SQL preparada para solicitudes directas y RPC SECURITY DEFINER.
- Contrato consistente de `NULL` y edición posterior a hora real. Medianoche histórica conservada.
- Importes separados por moneda y etiquetados como servicios, sin inferir pagos.
- Errores de PDF visibles, reserva guardada retenida si falla el PDF y archivos con UUID/upsert=false para preservar versiones. El número de versión sigue calculándose desde el máximo: dos generaciones simultáneas pueden compartir número, pero no sobreescribir el archivo. Una asignación atómica de versiones requeriría otro cambio SQL después de revisar los datos existentes.
- Precio finito/no negativo y decimales; IDs useId; escapes de búsqueda; timestamp de historial corregido; controles de formulario y scroll compactos.
- Botones Siguiente y Guardar tienen identidades distintas; el handler también rechaza envíos antes de Confirmar. Prueba automatizada con todos los hooks remotos simulados verifica que avanzar no escribe nada y Guardar hace un único envío.
- **Incidente de QA resuelto con autorización explícita del usuario:** borrado lógico del folio DT-2026-000056 y su cliente, después de comprobar que se crearon juntos y que el cliente no tenía otras reservaciones. Verificación posterior confirmó ambos ocultos y RPC pública vacía. Se conservaron registros/archivo PDF para recuperación y auditoría; el folio consumido no se reutilizó. Ninguna reservación real se editó o canceló.
- `lint` ahora comprueba TypeScript estricto y Prettier; no se forzó un parser incompatible ni se degradó TypeScript.
- Actualización transitiva compatible mediante npm audit fix, sin --force. La ejecución fuera del sandbox resolvió el EPERM de PDFKit sin modificar dependencias internas.

## 8. Seguridad

Frontend: registro público sin alta, perfil activo/coincidente, permisos activos, revalidación al foco/cada 30 s y caché de sesión aislada. SQL preparado: políticas restrictivas de tablas y Storage, triggers para proteger escrituras SECURITY DEFINER, permisos de funciones, guard de rol/permisos/active y metadatos app_metadata confiables para crear empleados. Edge Function: verificación de admin, validación, CORS y reversión si falla el perfil.

La RPC pública preserva los campos esenciales del ticket y excluye teléfono, correo, precio y notas. Tickets ocultos no se devuelven. Las URLs firmadas de PDFs privados duran una hora; una URL ya emitida conserva esa vigencia. El QR público y los PDFs históricos son documentos existentes, no un canal de tracking.

**La defensa del servidor nueva requiere desplegar 0005 y la Edge Function.** El código frontend por sí solo no reemplaza RLS. No se modificaron policies, perfiles, roles, credenciales ni secretos de producción durante la implementación.

## 9. Pendientes e integraciones

- GPS, coordenadas/geocodificación, mapas conectados, retrasos de vuelos y clima requieren datos/APIs reales; no se conectó ningún proveedor externo.
- Cobros, anticipos, saldo y reembolsos requieren definir un libro de pagos y migraciones financieras. Los campos actuales solo incluyen precio, moneda y método.
- Vencimiento de licencias, historial/fechas de mantenimiento, VIP persistido, duración de viaje y estados por trayecto requieren nuevos datos del dominio.
- El estado “En camino” no se añadió al enum existente; está disponible como borrador WhatsApp para revisión del operador. “Programado”/“Por asignar” son indicadores derivados de asignaciones; los estados SQL originales se conservan.
- No se despliega hosting ni migraciones de producción automáticamente. El servidor local y la documentación permiten revisar el resultado antes del despliegue.

## 10. Cómo probar

Realiza los pasos de escritura en una copia de Supabase o entorno autorizado. No uses producción para introducir datos demo.

| Función              | Verificación                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login / seguridad    | Entrar con empleado activo; comprobar módulos/roles. En copia, desactivar el perfil y verificar cierre, RLS y rechazo de RPC; signup sin app_metadata no crea perfil operativo. |
| Búsqueda / sidebar   | Buscar folio, vuelo, teléfono y entradas de directorios; abrir resultado. Colapsar/expandir y revisar títulos; menú en móvil.                                                   |
| Nueva reservación    | Completar los seis pasos, confirmar que avanzar no guarda, cerrar/reabrir panel y comprobar borrador. Guardar explícitamente y verificar folio y PDF.                           |
| Regreso pendiente    | Elegir Ida y regreso, fecha/rutas y Por determinar; input deshabilitado, preview sin hora artificial. Guardar y comprobar return_time NULL.                                     |
| Hora real posterior  | Abrir detalle, quitar Por determinar, poner 16:30, guardar y regenerar. Verificar tabla/agenda/QR/PDF e historial después de 0005.                                              |
| Agenda / operaciones | Día/Semana/Mes, navegación de fechas, trayectos de regreso y pendientes fuera del horario. Tabla/Agenda/Operaciones en Reservaciones.                                           |
| Conflictos           | Asignar capacidad inferior, conductor fuera de turno o recurso con otra salida cercana; comprobar advertencias sin bloqueo.                                                     |
| Flota / conductores  | Agregar/editar solo en copia; comprobar fotos, estados, asignación y conteos derivados. No hay fechas inventadas.                                                               |
| Clientes             | Buscar, abrir historial, revisar monedas separadas y guardar notas en copia.                                                                                                    |
| Catálogos            | Editar/desactivar una entrada en copia; verificar reutilización en formularios. Servicio asignado requiere 0006.                                                                |
| Cancelación          | Elegir motivo, comentario y confirmar solo en copia; revisar estado, history.note, actividad y ticket público. Otro requiere explicación.                                       |
| Versiones            | Regenerar dos PDFs, abrir versiones firmadas y revisar fecha/usuario. Una versión anterior conserva su contenido.                                                               |
| Reportes             | Variar fechas y moneda; comparar con las filas fuente, descargar CSV en Excel e imprimir a PDF. Cancelaciones no suman al importe.                                              |
| WhatsApp             | Elegir plantilla, editar borrador, abrir el enlace y revisar. No se envía un mensaje desde la aplicación.                                                                       |
| Responsive           | Revisar 1920×1080, 1440×900, 1366×768, 768×1024 y 390×844. Tablas con scroll interno y menú móvil.                                                                              |

### QA ejecutada

- Login real, navegación de rutas, búsqueda por folio, agenda Día/Semana/Mes, tres vistas de reservaciones, CRM/historial, flota vacía, usuarios, configuración/catálogos, actividad, ayuda/notificaciones y sidebar.
- Formulario: borrador conservado al cerrar y regreso pendiente aceptado. Escrituras de negocio/cancelación/permisos verificadas en PostgreSQL aislado, no sobre reservas reales.
- Dos PDFs reales con logo/QR: extracción comprobó una página A4, moneda, “Por determinar” y “16:30”. Render Poppler e inspección visual de ambas páginas sin recortes ni solapamientos.
- Medición DOM del dashboard: ningún desbordamiento horizontal del documento en los cinco tamaños. Las tablas conservan scroll horizontal dentro de su contenedor.
- 19 pruebas automatizadas: 9 de operación/reportes, 7 SQL, 2 PDF y 1 del formulario. Build de producción y lint (TypeScript + Prettier) aprobados; npm audit: 0 vulnerabilidades; git diff --check: sin errores de whitespace. Vite conserva un aviso de tamaño: entrada de unos 526 kB y generador PDF de unos 1,23 MB cargado bajo demanda; no impide el build.
- Pendiente: aplicar las migraciones y desplegar la Edge Function en Supabase, luego repetir el circuito completo en staging; validar la entrega desde el hosting definitivo.

### Inventario del checkout

Archivos modificados respecto de Git (incluye cambios locales previos conservados):

```text
.gitignore
README.md
package-lock.json
package.json
src/components/dashboard/ReservationMiniList.tsx
src/components/dashboard/RevenueChart.tsx
src/components/dashboard/StatCard.tsx
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
src/components/reservations/ReservationActions.tsx
src/components/reservations/StatusBadge.tsx
src/components/reservations/StatusTimeline.tsx
src/components/tickets/CustomerAutocomplete.tsx
src/components/tickets/RoundTripFields.tsx
src/components/tickets/TicketForm.tsx
src/components/tickets/TicketPreview.tsx
src/components/tickets/VehicleDriverSelect.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/ConfirmDialog.tsx
src/components/ui/EmptyState.tsx
src/components/ui/Field.tsx
src/components/ui/Modal.tsx
src/components/ui/PageHeader.tsx
src/context/AuthContext.tsx
src/features/customers/hooks.ts
src/features/dashboard/hooks.ts
src/features/drivers/api.ts
src/features/drivers/hooks.ts
src/features/reports/hooks.ts
src/features/reservations/api.ts
src/features/reservations/hooks.ts
src/features/settings/hooks.ts
src/features/users/api.ts
src/features/users/hooks.ts
src/features/vehicles/api.ts
src/features/vehicles/hooks.ts
src/lib/format.ts
src/lib/supabaseClient.ts
src/lib/validators/reservationSchema.ts
src/pages/ComingSoonPage.tsx
src/pages/CreateTicketPage.tsx
src/pages/CustomerDetailPage.tsx
src/pages/CustomersPage.tsx
src/pages/DashboardPage.tsx
src/pages/DriversPage.tsx
src/pages/LoginPage.tsx
src/pages/NotFoundPage.tsx
src/pages/ReportsPage.tsx
src/pages/ReservationDetailPage.tsx
src/pages/ReservationsPage.tsx
src/pages/SettingsPage.tsx
src/pages/SignupPage.tsx
src/pages/UsersPage.tsx
src/pages/VehiclesPage.tsx
src/pdf/TicketDocument.tsx
src/pdf/buildTicketData.ts
src/pdf/generateTicketPdf.tsx
src/routes/AppRouter.tsx
src/routes/ProtectedRoute.tsx
src/styles/index.css
src/types/database.types.ts
src/types/domain.ts
supabase/functions/create-employee/index.ts
```

Archivos nuevos de esta intervención:

```text
docs/AUDITORIA.md
docs/IMPLEMENTACION_V2.md
src/components/operations/AgendaView.tsx
src/components/operations/DispatchBoard.tsx
src/components/operations/OperationTable.tsx
src/components/reservations/ActivityList.tsx
src/components/reservations/CancellationModal.tsx
src/components/reservations/TicketVersions.tsx
src/components/reservations/WhatsAppTemplates.tsx
src/components/ui/Badge.tsx
src/components/ui/CatalogManager.tsx
src/components/ui/QueryState.tsx
src/features/activity/hooks.ts
src/features/settings/catalogs.ts
src/lib/operations.ts
src/lib/reports.ts
src/lib/useDialog.ts
src/pages/ActivityPage.tsx
src/pages/AgendaPage.tsx
supabase/migrations/0005_staff_security_and_activity.sql
supabase/migrations/0006_reservation_service_catalog.sql
tests/migrations.test.ts
tests/operations.test.ts
tests/reservationWizard.test.tsx
tests/ticketPdf.test.tsx
vitest.config.ts
```

Archivos sin seguimiento que ya existían al empezar:

```text
src/features/public/api.ts
src/features/public/hooks.ts
src/pages/PublicTicketPage.tsx
supabase/migrations/0004_public_ticket_verification.sql
vercel.json
```

La corrección posterior de composición y estilo según las imágenes de referencia está documentada en [Revisión visual](REVISION_VISUAL.md).
