# Revisión visual de RickyTickets

Fecha: 5 de octubre de 2026.

Se corrigió la composición usando las dos guías visuales del usuario: dashboard compacto, sidebar con marca destacada, encabezado tropical, acentos dorados, formulario lateral y ticket en papel crema.

## Cambios

- Paleta carbón más neutra y separadores discretos. Logo existente más grande, centrado, con paisaje en la parte inferior del sidebar.
- Encabezado panorámico de Tulum, saludo con tipografía serif y hora real de Quintana Roo.
- Indicadores con número principal, etiqueta debajo e iconos con fondos por categoría.
- Operación, mapa y alertas alineados; despacho debajo; métricas, rutas y estados en la fila inferior. Se usan consultas y reservaciones reales.
- El panel de nueva reservación ocupa una columna de 360 px en pantallas desde 1600 px. En tamaños menores funciona como modal; cerrar conserva el borrador. En escritorio permite seguir usando el dashboard.
- Pasos circulares conectados, campos compactos, resumen de reservación y botón siguiente al pie.
- Vista previa HTML del ticket en papel crema con fotografía lateral. La hora de regreso pendiente aparece con borde dorado.
- Aerolínea y vuelo de regreso se muestran en el paso Vuelo, junto a los datos de ida. Se conservan los campos, validaciones y payload existentes.

El mapa continúa como módulo preparado, sin posiciones inventadas ni API externa nueva, según la solicitud original. La hora local sustituye el bloque de clima de las referencias porque el proyecto no tiene proveedor meteorológico. Las gráficas muestran información real; el indicador circular representa estados de reservación y no cobros.

## Validación

- Compilación de producción y chequeo de TypeScript.
- Formato de código y documentación mediante `npm run lint`.
- 19 pruebas locales aisladas, incluida la regresión que impide guardar al pulsar Siguiente.
- Revisión en navegador a 1672 × 940 y 390 × 844. En móvil, el formulario conserva foco modal y no genera desbordamiento horizontal.
- Revisión del regreso «Por determinar» en el formulario y el ticket, sin enviar el borrador.
- No se crearon, editaron ni cancelaron registros de Supabase durante esta revisión visual.

Capturas locales, excluidas de Git:

- `docs/capturas/revision-dashboard-panel.jpg`
- `docs/capturas/revision-reservacion-ticket.jpg`

## Recurso visual

Archivo final: `src/assets/tulum-coast-v2.png` (1536 × 1024). Se generó con la herramienta integrada de imágenes, siguiendo la skill `imagegen`, y se guardó dentro del proyecto. Se reutiliza en el encabezado, sidebar y vista previa. Es un recurso decorativo; no representa tracking ni una fotografía de un servicio registrado.

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: decorative background photograph for a premium Danny Transfers operations dashboard in Tulum, Mexico. Create a single wide 3:2 editorial travel photograph: a tropical Caribbean coast at Tulum, turquoise ocean, pale limestone Mayan ruin on a low cliff in the right distance, lush palms, and a luxury black passenger SUV without visible logos at the lower left on a coastal driveway. Natural late afternoon warm golden light, sophisticated restrained cinematic contrast, realistic textures. Broad sea and sky across the upper half so a very shallow wide header crop works; lower-left palms and SUV should also work as a narrow vertical sidebar crop. No typography, labels, watermarks, UI, diagrams, people, maps or graphic overlays. This is illustrative brand scenery, not operational tracking.

La plantilla PDF y sus pruebas se conservan. La revisión de color del papel corresponde a la vista previa HTML; no se introdujeron servicios externos, credenciales ni dependencias nuevas.

## Archivos de esta revisión

```text
src/assets/tulum-coast-v2.png
src/styles/index.css
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Topbar.tsx
src/components/dashboard/StatCard.tsx
src/components/dashboard/RevenueChart.tsx
src/components/operations/OperationTable.tsx
src/components/operations/DispatchBoard.tsx
src/components/tickets/CustomerAutocomplete.tsx
src/components/tickets/RoundTripFields.tsx
src/components/tickets/TicketForm.tsx
src/components/tickets/TicketPreview.tsx
src/components/tickets/ReservationSummary.tsx
src/components/ui/Button.tsx
src/pages/DashboardPage.tsx
src/pages/CreateTicketPage.tsx
docs/REVISION_VISUAL.md
docs/IMPLEMENTACION_V2.md
```
