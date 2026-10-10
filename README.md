# RickyTickets V2 · Danny Transfers

Plataforma de reservaciones, tickets y operación para Danny Transfers. Mantiene React, TypeScript y Supabase del proyecto existente.

## Ejecutar el proyecto

Requisitos: Node.js 22.12 o superior y npm. La validación de esta entrega utilizó Node.js 26.8.1.

```powershell
npm install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

Si ya existe `.env.local`, conserva ese archivo. Configura exclusivamente las claves públicas de tu proyecto:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

No agregues la clave `service_role` al frontend. `.env*` está excluido de Git. Las credenciales utilizadas para QA no se guardaron en el código ni en la documentación.

```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```

Abre <http://127.0.0.1:5173>. Para producción:

```powershell
npm run build
npm run preview
```

El build se genera en `dist/`. El hosting debe redirigir las rutas de la aplicación a `index.html`; se conserva `vercel.json`.

## Supabase y migraciones

**Las migraciones 0005 a 0008 están preparadas y probadas localmente; no se aplicaron a la base real.**

Para una instalación nueva, aplica los archivos en orden:

1. `0001_init.sql`: esquema, funciones, RLS y buckets.
2. `0002_seed.sql`: configuración y catálogos iniciales del proyecto.
3. `0003_fix_handle_new_user.sql`: corrección previa del trigger de perfiles.
4. `0004_public_ticket_verification.sql`: RPC para verificar el ticket mediante QR; cambio local que ya existía.
5. `0005_staff_security_and_activity.sql`: acceso de empleados activos, bloqueo de altas públicas y auditoría de cambios.
6. `0006_reservation_service_catalog.sql`: servicio configurable opcional de la reservación.
7. `0007_reservation_locations.sql`: coordenadas opcionales de recogida y destino.
8. `0008_single_page_reservations.sql`: borradores, anticipo y hora del vuelo; marca como obsoletas las tablas de flota sin eliminarlas ([detalle](docs/RESERVACION_UNA_PAGINA.md)).

En una base existente, revisa qué migraciones están aplicadas, realiza un respaldo y prueba las pendientes en una copia antes de aplicarlas. **No vuelvas a ejecutar el esquema inicial ni el seed en producción.** 0005 conserva las políticas previas y añade restricciones; 0006 conserva `sencillo/redondo` y no modifica reservaciones históricas. Ninguna de las dos añade datos demo.

`return_time` ya admite `NULL`: “Por determinar” funciona sin añadir una columna de estado pendiente. Sin 0008, «Guardar borrador», el anticipo y la hora del vuelo aparecen desactivados con un aviso; el resto del formulario funciona. Las medianoches históricas `00:00` se conservan como horas reales. La selección de servicio del catálogo se habilita cuando está disponible la columna de 0006; ubicaciones y métodos de pago reutilizan la tabla existente.

## Acceso y empleados

- Desactiva el registro público en la configuración de Supabase Auth. `/registro` muestra instrucciones de acceso para empleados y no crea cuentas.
- En una instalación nueva, crea el primer administrador desde un entorno administrativo confiable: Auth Admin API con `app_metadata.staff_access=true` y `app_metadata.staff_role=admin`, después de aplicar las migraciones. Si el usuario ya existe sin perfil, un administrador de la base debe insertar explícitamente su perfil verificado. No existe un bootstrap público de “primer usuario = admin”.
- Los administradores existentes conservan sus perfiles. No los recrees ni cambies sus credenciales al actualizar.
- Despliega la Edge Function actualizada después de 0005:

```powershell
supabase functions deploy create-employee
```

La función usa `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en el servidor. Verifica que esos secretos estén disponibles en el proyecto. “Usuarios → Nuevo empleado” requiere una sesión de administrador activo. La función crea el usuario con metadatos confiables, guarda los permisos y revierte el alta si falla la creación del perfil.

El frontend revisa el perfil al iniciar sesión, al recuperar foco y cada 30 segundos. La protección efectiva frente a solicitudes directas de cuentas públicas o desactivadas depende de aplicar 0005 en Supabase.

## Validación local

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

- `lint`: TypeScript estricto y formato Prettier. Se reparó el script previo sin forzar un parser ESLint incompatible con TypeScript 7.
- `format`: formatea `src`, pruebas y documentación.
- Las pruebas SQL usan PostgreSQL aislado en memoria con PGlite y no acceden a Supabase.
- Las pruebas del formulario simulan todos los hooks remotos: cubren solo ida, ida y regreso, «Por determinar», vuelo, hotel, estados de pago, borrador, edición y un único envío por guardado.
- Las pruebas PDF utilizan la plantilla real, logo y QR con datos aislados. No suben archivos. `RICKY_PDF_QA=1` conserva dos PDFs temporales en `tmp/pdfs/` para inspección; esa carpeta está excluida de Git.

En el entorno restringido de Codex para Windows fue necesario ejecutar build/pruebas PDF fuera del sandbox para resolver archivos de PDFKit. Los comandos anteriores funcionan en la terminal normal del proyecto.

## Funciones principales

- Dashboard con servicios de ida/regreso, despacho, alertas y cifras reales.
- Búsqueda global y navegación colapsable.
- Nueva reservación en una sola página con resumen en tiempo real: cliente, servicio y ruta, vuelo, hotel, pago con anticipo/restante/estado y notas. Borradores, regreso «Por determinar», edición con la misma pantalla y regeneración de PDF.
- Reservaciones en tabla, agenda y operaciones; agenda diaria, semanal y mensual.
- CRM, notas del cliente, catálogos, cancelaciones con motivo, actividad y versiones de ticket. La gestión de conductores y vehículos se retiró del sistema.
- Reportes por periodo y moneda, CSV compatible con Excel y PDF mediante impresión del navegador.
- Plantillas de WhatsApp mediante enlaces estándar; el operador revisa y envía el mensaje.

El horario operativo corresponde a Quintana Roo (`America/Cancun`). Las asignaciones y el estado pertenecen a toda la reservación; el esquema no tiene estados por trayecto. No hay GPS, seguimiento de vuelos ni registro contable de cobros. Los reportes muestran importes de reservaciones elegibles, separan MXN/USD y no inventan anticipos, pagos ni reembolsos.

## Documentación

- [Auditoría previa](docs/AUDITORIA.md).
- [Resumen técnico, inventario de archivos y guía de QA](docs/IMPLEMENTACION_V2.md).
- [Mapa de operaciones V1, tipografía e integración geográfica futura](docs/MAPA_OPERACIONES_V1.md).

## Estructura

```text
src/pages/        Vistas y rutas
src/components/   Layout, UI, operación, tickets y reservaciones
src/features/     APIs y hooks de datos por dominio
src/pdf/          Plantilla real, QR, generación y Storage
src/context/      Sesión y perfil
src/routes/       Router y protección de acceso
src/lib/          Validadores, operación, reportes y utilidades
src/types/        Tipos Supabase y de dominio
supabase/         Migraciones y Edge Functions
tests/           Pruebas aisladas de negocio, SQL, formulario y PDF
docs/            Auditoría y entrega técnica
```

# Integración con Amaya

El puente de reservas incluye la migración 0009, la Edge Function `amaya-sync` y
pruebas aisladas. Su activación en Supabase está pendiente: seguir
[docs/AMAYA_SYNC.md](docs/AMAYA_SYNC.md) antes de usarlo en producción.
