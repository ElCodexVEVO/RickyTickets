# Reservas compartidas con Amaya

Estado de esta entrega: implementación preparada y probada localmente. Requiere
instalar la migración y la función en el Supabase real antes de activarla.

Amaya envía sus reservas reales y recibe los cambios de Ricky Tickets mediante
una Edge Function con autenticación HMAC. Ricky sigue usando su tabla
`reservations`, sus folios `DT`, sus permisos y su historial. No requiere otra
cuenta para que el equipo vea las reservas recibidas.

## Instalar

1. Confirmar el proyecto `dfvgvpdgfqvpjblngkrb` y hacer una copia de seguridad.
   Comprobar las migraciones instaladas: el repositorio incluye 0005–0008, pero
   su presencia en Git no prueba que estén aplicadas en producción. Revisar y
   aplicar las que falten antes de 0009. No ejecutar las semillas ni reiniciar la base.
2. Aplicar `supabase/migrations/0009_amaya_sync.sql` una sola vez. Añade columnas,
   revisiones, una tabla de idempotencia y RPC privadas; no borra reservas.
3. Generar un secreto aleatorio de al menos 32 bytes con un gestor de secretos.
   Guardar el mismo valor en `AMAYA_SYNC_SECRET` de las Edge Functions y en
   `RICKY_SYNC_SECRET` del hosting de Amaya. No usar la clave pública de Supabase
   como secreto, ni incluir el secreto en variables `VITE_` o `NEXT_PUBLIC_`.
4. Desplegar `supabase/functions/amaya-sync/index.ts` y `security.ts`, conservando
   `verify_jwt = false` para **esta función únicamente**. El controlador comprueba
   HMAC y caducidad antes de acceder a la base. `create-employee` conserva su configuración.
5. Configurar en el servidor de Amaya:

   ```text
   RICKY_SYNC_URL=https://dfvgvpdgfqvpjblngkrb.supabase.co/functions/v1/amaya-sync
   RICKY_SYNC_SECRET=<el mismo secreto, privado>
   ```

   Mantener separadas las variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
   de Amaya: su esquema no es el de Ricky. Amaya usa D1 actualmente. Si cambia a
   su propio Supabase, aplicar también su migración `202610100001_sync_commit.sql`.

6. Publicar el frontend de esta rama para refrescar lista, detalle e historial
   de Ricky cada 30 segundos mientras estén visibles. La función y la migración
   son imprescindibles; el refresco del frontend es una mejora de visualización.
7. En Amaya → Administración → Ricky Tickets, pulsar **Sincronizar** y comprobar
   “Conectado”. Crear una reserva real de prueba autorizada o usar un entorno de
   staging con pagos de prueba; las reservas `isDemo` nunca salen de Amaya.

## Verificar antes de operar

- Crear en Amaya: comprobar un único folio DT y su referencia AMY en Supabase.
- Editar fecha/hora en Ricky y refrescar Amaya; luego editar en Amaya y comprobar Ricky.
- Reintentar con el mismo evento: debe conservar el folio y no duplicar reservas.
- Editar simultáneamente: Amaya debe mostrar el conflicto y conservar ambas versiones.
- Confirmar regreso sin hora: aparece “Por determinar”, sin inventar las 00:00.
- Confirmar que una petición sin HMAC devuelve 401 y que anon/authenticated no
  pueden ejecutar las RPC del puente ni leer `amaya_sync_events`.
- Verificar que cancelar un traslado no cambia anticipos ni reembolsa Stripe.

La aplicación sincroniza después de cambios en Amaya, al consultar una reserva y
cada 30 segundos con el panel de Amaya visible. No hay un cron instalado: con
ambas aplicaciones cerradas, un cambio de Ricky se recibe en la siguiente consulta.
El panel guarda la última copia recibida y distingue conexión, pendientes y conflictos.
Al activar por primera vez se comparten todas las reservas reales de Amaya y se
reciben las reservas existentes de Ricky, incluidas eliminaciones como señales de revisión.

## Campos y límites

Se comparten pasajero/contacto, origen/destino, hotel, fechas/horas, pasajeros,
tipo de viaje, aerolínea/vuelo, notas operativas y estado. Los estados detallados de
Amaya se agrupan en `pending`, `confirmed`, `in_service`, `completed`, `cancelled`.
Ricky conserva sus borradores. Asignaciones de vehículo/conductor, extras,
coordenadas, datos de terminal, habitación y vuelo de regreso no se sincronizan.
Las reservas nacidas en Ricky se administran en el módulo compartido de Amaya;
no se inventa un vehículo o un checkout para ellas.

El importe/moneda inicial de Amaya se envía al crear. Los ajustes posteriores de
importe requieren conciliación manual. `deposit` sigue siendo el registro de
Ricky, y `amaya_payment` es una referencia separada a pagos verificados de Amaya.
La integración no ejecuta cobros ni reembolsos, ni modifica el importe de Stripe.
Los conflictos no se resuelven por “último en guardar”: el administrador compara
los datos y elige una versión. Reservas eliminadas o con pasajeros que superan la
capacidad del vehículo de Amaya requieren revisión; no se importan silenciosamente.

El secreto autoriza únicamente el puente; no se comparte la clave service-role de
Supabase ni un token de acceso general al sitio de Amaya. Los eventos exitosos se
conservan para reintentos idempotentes. Definir una política de retención acorde a
los periodos de reintento y privacidad antes de un uso masivo. El intercambio usa
páginas de 100 reservas: valorar un feed incremental y tareas programadas cuando
el volumen crezca.

## Pruebas locales

```text
npm ci
npm test
npm run typecheck
npm run build
```

Las pruebas de migración usan PostgreSQL aislado con PGlite, sin clientes reales.
Las de HMAC comprueban alteración, clave incorrecta, caducidad y falta de firma.
En Amaya: `node --test scripts/test-ricky-sync.mjs` verifica proyección segura,
exclusión de demos, conservación de pagos y escritura condicional en SQLite.

Referencias oficiales: [secretos de Edge Functions](https://supabase.com/docs/guides/functions/secrets)
y [configuración de funciones](https://supabase.com/docs/guides/functions/function-configuration).
