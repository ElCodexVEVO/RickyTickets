# Auditoría RickyTickets V2

Fecha: 5 de octubre de 2026. Inspección realizada antes de modificar código.

- React 19, Vite 8, TypeScript estricto, Tailwind 4. Formularios React Hook Form/Zod, datos TanStack Query, navegación React Router con carga diferida.
- `AuthContext` mantiene sesión y perfil. `ProtectedRoute` solo verificaba sesión; faltaba comprobar perfil activo. `/registro` exponía signup. La Edge Function `create-employee` ya verificaba administrador, pero faltaban CORS y manejo de errores al ajustar perfiles.
- Supabase: profiles, customers, vehicles, drivers, service_catalog_items, folio_counters, reservations, reservation_status_history, ticket_files, settings y activity_logs. RLS existente revisada en 0001; trigger de alta corregido en 0003; RPC pública de verificación en 0004 (cambio local preexistente).
- Algunas políticas SELECT/INSERT permiten cualquier sesión autenticada. `create_reservation` usa SECURITY DEFINER y solo verificaba auth.uid; requiere defensa adicional para perfiles inactivos/sin perfil. Cancelar y eliminar están reservados a admin en SQL.
- Regreso: `return_time time` ya es nullable y la RPC convierte vacío a NULL. El bloqueo estaba en Zod y en la interfaz. No hace falta crear return_time_pending ni reinterpretar medianoche histórica.
- Estados existentes: pending, confirmed, in_service, completed, cancelled. No hay estados persistidos de cada trayecto ni GPS ni duración de servicio; advertencias de proximidad no pueden garantizar superposición real.
- PDF: @react-pdf/renderer, plantilla compartida con preview mediante TicketData, QR qrcode hacia `/verificar/:id`, bucket privado tickets y tabla ticket_files. Los cambios locales existentes fuerzan regeneración y añaden ticket público; se preservan. Faltaba comprobar errores y evitar sobreescritura concurrente de versiones.
- Reservaciones: RPC atómica para crear cliente/reserva y folio; UPDATE directo para edición; cancelación con nota almacenada en reservation_status_history; soft delete. El editor no incluía regreso, pasajeros ni vuelo.
- Clientes: estadísticas por trigger; total_spent mezcla monedas y no es un libro contable. Reportes existentes también sumaban USD/MXN. No hay columnas de anticipo, pagado o reembolso; no se deducirán pagos a partir de estado/método.
- Flota/conductores: CRUD, fotos en Storage, capacidad, estados, licencia y vehículo asignado. No hay fechas de mantenimiento/vencimiento ni tracking.
- Configuración: settings operativos; catálogos existen pero no estaban gestionados ni utilizados por el formulario. service_type del catálogo describe servicios (tour/aeropuerto), mientras el enum de reserva describe solo ida/ida y regreso: son conceptos distintos.
- activity_logs operativo para create/cancel/delete vía RPC; cambios de campos no se registraban. ticket_files ya versionado, sin pantalla de versiones.
- No se encontraron AGENTS.md aplicables. Checkout con cambios locales: .gitignore, cliente Supabase, hooks de reservas, PDF, router, módulo público, migración 0004 y vercel.json; se conservan.

## Verificación inicial

`npm install` completado. `tsc --noEmit` pasó como parte del build inicial; Vite encontró un EPERM al resolver el perfil ICC de pdfkit dentro de node_modules bajo el sandbox de Windows. Servidor Vite iniciado en http://127.0.0.1:5173. La comprobación real de autenticación/operaciones necesita una cuenta autorizada. No se ejecutaron migraciones remotas ni se crearon datos demo.
