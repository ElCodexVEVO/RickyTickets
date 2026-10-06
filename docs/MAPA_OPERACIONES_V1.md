# Mapa de operaciones V1 y tipografía

## Auditoría del proyecto

El esquema de reservaciones, los tipos de Supabase, las consultas y las dependencias instaladas se revisaron antes de implementar el módulo. Hay direcciones de origen/destino, fechas y horas de ida/regreso, vuelos, pasajeros, cliente, conductor, vehículo y estado de reservación. No hay columnas de coordenadas, geometría de rutas, posiciones GPS, integración de geocodificación ni librería de mapas instalada.

Los estados persistidos son `pending`, `confirmed`, `in_service`, `completed` y `cancelled`. “En camino” existe únicamente como plantilla manual de WhatsApp: no acredita movimiento ni actualiza el estado. Los estados y las asignaciones corresponden a la reservación completa, no a cada trayecto.

No se añadieron dependencias, migraciones, claves de API ni datos de demostración a la aplicación. La validación contra la base real se hizo mediante lectura. Las escrituras se comprobaron únicamente con mocks locales.

## Comportamiento

- La lista usa todos los servicios del periodo, con desplazamiento interno; no se limita a las dos reservaciones del bloque anterior.
- Cada ida y regreso tiene una clave independiente (`id-out` / `id-back`). Una vuelta sin hora conserva “Por determinar”; una vuelta sin fecha aún no puede ubicarse en un día de la lista.
- La ficha presenta folio, cliente, puntos del trayecto seleccionado, fecha/hora, pasajeros, vuelo, conductor, vehículo y estado real de reservación.
- `Ver reservación` y `Editar` abren las rutas existentes. `Cambiar estado` usa el hook existente y requiere `canEditReservations` y pulsar **Aplicar cambio**. La ficha informa que el cambio afecta también al regreso. La cancelación conserva su flujo existente en la reservación.
- `Contactar cliente` abre las plantillas existentes cuando hay teléfono. El operador revisa el mensaje y abre WhatsApp; seleccionar un servicio o una plantilla no envía mensajes ni cambia estados.
- Las alertas de falta de conductor/vehículo, regreso pendiente, revisión de asignación y mantenimiento seleccionan el servicio relacionado. Para mantenimiento se conserva `vehicleId` y se busca el próximo servicio asignado a esa unidad. Si no tiene servicio relacionado, la alerta permanece informativa.
- Las alertas de otra fecha cambian a **Todo el día** y muestran esa fecha. Una alerta de regreso pendiente elige el regreso; no el trayecto de ida.
- Se conservan la tabla de operación, el tablero de despacho, la agenda, el formulario, la generación de PDF y los controles de permisos existentes.

## Filtros y colores

Se usa la zona `America/Cancun`. El reloj del módulo se actualiza cada minuto.

| Filtro temporal | Alcance                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hoy             | Trayectos de la fecha actual, excepto completados. Un horario pasado no se interpreta como completado o retrasado.                                         |
| Próximas 2 h    | Hora de salida registrada entre ahora y 120 minutos después, incluidos ambos extremos y el cambio de fecha. Excluye completados y horarios por determinar. |
| Todo el día     | Todos los trayectos de la fecha elegida, incluidos completados. Al elegirlo se vuelve a la fecha actual; el selector permite consultar otra fecha.         |

Todos los periodos excluyen cancelaciones y registros borrados lógicamente.

| Filtro de estado | Regla                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Todos            | Todos los servicios del periodo.                                                           |
| Por iniciar      | Reservaciones pendientes/confirmadas con hora igual o posterior a ahora.                   |
| En camino        | Sin resultados mientras la base no registre ese estado; la interfaz explica la limitación. |
| En servicio      | `status = in_service`.                                                                     |
| Sin asignar      | Falta conductor o vehículo y la reservación no está completada.                            |

Programado usa azul; Por asignar, dorado; En servicio, verde; Completado, gris. Las reservaciones asignadas pero pendientes muestran “Pendiente de confirmar”. Las advertencias de asignación usan rojo y conservan la etiqueta del estado. La proximidad de horarios usa la regla existente de 120 minutos y requiere revisión: no confirma duración del recorrido, retraso o un conflicto definitivo.

## Capa geográfica

`OperationsGeography` es un adaptador separado del esquema actual, indexado por **clave de trayecto**. `ServiceGeography` admite origen y destino con `latitude`/`longitude`, y opcionalmente una ruta GeoJSON `LineString` con pares `[longitude, latitude]`.

El dashboard no tiene una fuente de coordenadas; por eso pasa datos reales de reservación sin geometría. La interfaz muestra **Ubicación pendiente**, conserva la lista y la ficha, y no solicita GPS. Los contadores separan servicios con alguna ubicación de los que aún no tienen ninguna. Un resultado vacío muestra **No hay servicios activos en este momento.**

El renderer SVG ligero admite puntos verificados, selección por clic o teclado y resaltado desde la lista. Dibuja una línea exclusivamente cuando recibe una geometría válida; nunca une direcciones de texto ni presenta el origen como posición del vehículo. Valida coordenadas finitas y rangos geográficos. Ajusta el encuadre a los puntos cargados mediante una proyección regional sencilla, sin fondo cartográfico, navegación vial, mosaicos externos ni simulación de movimiento. Está preparado para sustituirse por un proveedor de mapas cuando exista una fuente de ubicaciones.

Para ubicar las direcciones haría falta:

1. Persistir coordenadas verificadas por punto y trayecto, junto con dirección normalizada, fuente y fecha de verificación.
2. Configurar una API de geocodificación con cobertura adecuada o un catálogo interno de lugares con coordenadas verificadas; revisar resultados ambiguos antes de guardarlos. No existe actualmente una API configurada que pueda reutilizarse.
3. Si se desean recorridos sobre calles, integrar una API de rutas que devuelva geometría real. La geocodificación sola no proporciona un recorrido vial.
4. Conectar esos datos al adaptador `OperationsGeography`. Si se requiere un mapa cartográfico completo, configurar también un renderer/proveedor de mosaicos, atribución, credenciales y límites de uso según el servicio elegido.

## Seguimiento V2

`DriverLocationUpdate` define el contrato reservado de `driver_id`, `reservation_id`, `latitude`, `longitude` y `last_location_update`. V1 no consume esa información ni crea un canal GPS.

Una V2 necesita una Driver App o enlace móvil autenticado; consentimiento y permisos de ubicación; un endpoint y almacenamiento con RLS que validen la asignación; envío de posiciones con marca de tiempo; suscripción de los operadores autorizados; detección de posiciones caducadas/desconexión; política de retención y un renderer cartográfico. También conviene registrar estados y eventos por trayecto, incluido `en_route`, antes de presentar movimiento o progreso independiente de ida/regreso.

## Diseño y tipografía

Inter sustituye a Work Sans en la interfaz usando la integración de Google Fonts ya existente, con respaldo de fuentes del sistema. Se conserva Playfair Display en el saludo y las fuentes del documento de ticket. No se modifica el motor PDF ni sus fuentes.

Se aumentó la legibilidad de encabezados, navegación, alertas y textos de operación/despacho. El módulo mantiene carbón, crema, dorado, bordes discretos y transiciones de 180 ms; respeta movimiento reducido. Escritorio usa mapa y lista/ficha en paralelo cuando hay espacio; tablet coloca el mapa arriba; móvil prioriza la lista y permite desplegar el mapa.

## Archivos de esta entrega

| Archivo                                              | Cambio                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/components/operations/OperationsMap.tsx`        | Composición, filtros, reloj, selección y enfoque desde alertas.                                   |
| `src/components/operations/OperationsMapFilters.tsx` | Filtros de estado, periodo y fecha accesibles.                                                    |
| `src/components/operations/OperationsMapCanvas.tsx`  | Renderer SVG de ubicaciones y geometrías verificadas.                                             |
| `src/components/operations/ActiveServicesList.tsx`   | Lista compacta y badges de estado operativo.                                                      |
| `src/components/operations/ServiceMapCard.tsx`       | Detalle, enlaces, estado explícito y plantillas WhatsApp.                                         |
| `src/components/operations/MapEmptyState.tsx`        | Estados de ubicación pendiente y resultados vacíos.                                               |
| `src/lib/operationsMap.ts`                           | Modelo de lectura, filtros, enlace de alertas y contratos geográficos/GPS futuro.                 |
| `src/lib/operations.ts`                              | Alertas por falta de vehículo, tipo de alerta, relación de mantenimiento y exclusión de borrados. |
| `src/pages/DashboardPage.tsx`                        | Sustitución del bloque anterior, enlace de todas las alertas y tipografía.                        |
| `src/components/operations/OperationTable.tsx`       | Tamaños de texto legibles.                                                                        |
| `src/components/operations/DispatchBoard.tsx`        | Tamaños de texto legibles.                                                                        |
| `src/components/layout/Sidebar.tsx`                  | Texto de navegación.                                                                              |
| `src/styles/index.css`                               | Fuente de interfaz, encabezados y etiquetas del formulario.                                       |
| `src/styles/operations-map.css`                      | Diseño del módulo y distribución adaptable.                                                       |
| `src/main.tsx`                                       | Importación directa de la hoja de estilos del módulo para producción y desarrollo.                |
| `index.html`                                         | Solicitud de Inter mediante la integración existente.                                             |
| `tests/operationsMap.test.tsx`                       | Pruebas aisladas del modelo, interacción y guardado.                                              |
| `README.md`                                          | Enlace a esta documentación.                                                                      |
| `docs/MAPA_OPERACIONES_V1.md`                        | Auditoría, límites, inventario y guía de integración.                                             |

Se reutilizan React, React Router, Lucide, los hooks de React Query y los componentes existentes. El mapa usa SVG/CSS nativos; **ninguna dependencia nueva**.

## Validación

- `npm run build`: correcto.
- `npm test`: 30 pruebas correctas, incluidas las 19 anteriores de SQL, negocio, formulario y PDF.
- `npm run lint`: TypeScript y formato correctos.
- Las 11 pruebas nuevas cubren filtros reales, medianoche, vuelta sin hora, cancelaciones/borrados, alertas, geometrías inválidas, selección/hover/teclado, permisos, guardado explícito y errores de actualización.
- Navegador local conectado a la sesión existente: lectura del dashboard, selección de servicio, acceso al diálogo de estado sin aplicar cambios, apertura de las plantillas sin enviar, filtros y alerta de otra fecha.
- Escritorio 1672×940, tablet 1024×900 y móvil 390×844: distribución, ficha, mapa colapsable y ausencia de desbordamiento horizontal.
- La ausencia real de coordenadas se verificó contra la sesión de Supabase; puntos y rutas se verificaron únicamente con fixtures locales.

Las capturas de QA se guardan en `docs/capturas/`, excluido del repositorio porque puede contener datos de clientes. La advertencia de tamaño de los bundles existentes de PDF y aplicación permanece; el módulo no incorpora una librería cartográfica adicional.
