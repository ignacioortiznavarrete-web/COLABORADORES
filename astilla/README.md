# astilla — SAP vs planilla de sub-productos

Dashboard de **astilla verde** en toneladas secas (TS), sobre el
spreadsheet `1PNQToRtF7g-obmmOHuoonNGN5-VhhTYnW6SEhK36EOk`.

Replica la lógica de complemento de MetroRuma: **SAP manda siempre**, y
la planilla que llega por correo solo tapa el hueco de los días que SAP
todavía no contabiliza.

---

## La regla, en una línea

Hasta la última *Fecha Contab.* se usan solo los datos de SAP. Desde el
día siguiente y hasta la última planilla recibida se usa
`CAMIONES × 11 TS`. Cuando SAP avanza, el estimado de ese día
desaparece solo.

## Las hojas

| Hoja | Qué contiene | ¿Obligatoria? |
|---|---|---|
| `Ingresos` | Descarga de SAP. Cantidad real por *Fecha Contab.* | Sí |
| `InformeAstilla` | La escribe el script con lo que extrae de los correos | La crea sola |
| `PlanAstilla` | Una fila por sub-producto, una columna por mes | No |
| `Mapeos` | Un aserradero por fila: nombre, dirección y estado | Para el mapa |

Las columnas de `Ingresos` se detectan por nombre de encabezado
(*Fecha Contab.*, *Descripción Material*, *Cantidad*, *Proveedor*…). Si
la descarga viene sin encabezados, se usan las posiciones fijas de
`CONFIG.INGRESOS_COLUMNS`.

`PlanAstilla` admite el mes como `AGO-2026`, `2026-08` o una fecha real.

## Sub-productos: SAP y la planilla no hablan igual

**La planilla** (el correo) desglosa en tres sub-productos; el resto
(aserrín, álamo, pino combustible) se ignora:

- `ASTILLA EUCALYPTUS NITENS`
- `AST. PINO VERDE C/ CORTEZA`
- `ASTILLA PINO VERDE`

**SAP no desglosa nada.** Todo el ingreso de astilla llega con una sola
descripción, `ASTILLA VERDE (TS)`, bajo el material `3000039`. Por eso
existe un cuarto bucket, `ASTILLA VERDE (TOTAL SAP)`, y por eso el
cruce por sub-producto solo se puede comparar a nivel de total: SAP no
tiene con qué repartir su cifra entre los tres.

El reconocimiento tolera `AST.` vs `ASTILLA`, plural, `C/ CORTEZA` vs
`CON CORTEZA`, tildes y espacios dobles. Si aparece otro nombre, se
agrega en `canonicalSubproducto_`; si es un código nuevo de SAP, en
`CONFIG.SAP_MATERIALES`.

## Si el dashboard no toma la hoja de SAP

Menú **Astilla Dashboard › Diagnosticar hoja de SAP**. Dice, en una
sola pantalla: qué hojas existen realmente y si `SHEET_INGRESOS`
coincide con alguna; los encabezados de la fila 1 y a qué columna quedó
mapeado cada campo; cuántas filas se descartaron y **por qué motivo**
(sin fecha, fuera de la ventana, material no reconocido); y las
descripciones que quedaron fuera del filtro.

Los encabezados se detectan por nombre exacto y, si eso falla, por
prefijo. Eso es lo que permite reconocer títulos de SAP como
`Proveedor Origen (RUT + NOMBRE )`, que ningún alias exacto cubre.

## Mapeo de aserraderos

Hoja `Mapeos`, una fila por aserradero. Tú pones **Nombre** y
**Dirección**; el resto lo maneja el dashboard.

**El estado es el motivo.** Todo nace en `Por visitar`. Solo `Cerrado`
pide cuántas cargas se cerraron —y las exige mayores que cero, porque
una gestión cerrada que no suma tonelaje no es un cierre—. Los demás
estados son, cada uno, la razón por la que no se cerró:

| Estado | Qué significa |
|---|---|
| `Por visitar` | Todavía no se gestiona. Es el estado inicial de todos. |
| `En negociación` | Hay conversación abierta, sin cerrar |
| `Cerrado` | Se cerró carga. **Pide el número de cargas.** |
| `Sin stock` | No tenía astilla disponible |
| `Precio fuera de mercado` | No se llegó a precio |
| `Comprometido con otro` | Su producción ya está tomada |
| `No hubo contacto` | No se logró hablar con nadie |

Para agregar o cambiar estados, edita `ESTADOS_MAPEO` en `Codigo.gs`:
cada uno lleva nombre, color en el mapa y si cierra o no. Después
vuelve a correr **Preparar hoja de mapeos** para actualizar la
validación de la columna.

### Puesta en marcha

1. **Astilla Dashboard › Preparar hoja de mapeos.** Crea la hoja,
   pone la validación de Estado, asigna un `ID` correlativo a cada
   fila y rellena en `Por visitar` todo lo que esté en blanco. Se
   puede correr las veces que sea.
2. Agrega tus aserraderos con nombre y dirección (la **comuna** ayuda
   mucho: hay «Camino a Nacimiento» en varias).
3. **Geocodificar direcciones.** Convierte las direcciones en
   coordenadas con el servicio Maps de Apps Script y las escribe en la
   hoja, para no volver a geocodificar lo mismo en cada carga. Solo
   toca las filas sin latitud, y avisa cuáles no pudo ubicar.

Los que no se puedan geocodificar siguen apareciendo en el listado
—marcados «sin ubicar»— y el dashboard dice cuántos son. Nunca se
pierden por no estar en el mapa. Si una dirección se resiste, escribe
latitud y longitud a mano en la hoja.

El mapa usa Leaflet sobre OpenStreetMap, sin API key. Si la red
corporativa bloquea el CDN, el mapa avisa y el listado y la gestión
siguen funcionando.

---

## Instalación

1. En el spreadsheet: **Extensiones › Apps Script**.
2. Pega `Codigo.gs` en el archivo de código y crea un archivo HTML
   llamado **`Index`** con el contenido de `Index.html`.
3. Ejecuta **`procesarPlanillasGmail`** una vez y acepta los permisos.
4. Menú **Astilla Dashboard › Instalar automatización** (revisa Gmail
   cada 15 minutos).
5. Para publicarlo como página: **Implementar › Nueva implementación ›
   Aplicación web**.

Si las planillas llegan como **Excel adjunto**, agrega además el
servicio avanzado **Drive API (v3)** en *Servicios › +*. Si llegan
pegadas en el cuerpo del correo, no hace falta.

## El menú

| Opción | Para qué |
|---|---|
| Abrir dashboard | Lo abre en una ventana sobre la planilla |
| Importar nuevas planillas | Lee los correos que faltan |
| Reconstruir planillas desde Gmail | Respalda `InformeAstilla` y reimporta todo |
| Probar último correo | Muestra lo que extraería, **sin escribir** |
| Diagnosticar cruce SAP vs planilla | Materiales fuera del filtro y proveedores sin par |
| Preparar hoja de mapeos | Crea/repara `Mapeos`: IDs, validación y estado inicial |
| Geocodificar direcciones | Ubica en el mapa las direcciones que aún no tienen coordenadas |

Antes de una carga masiva, corre siempre **Probar último correo**.

---

## Pendiente conocido

**El dato de astilla que hay hoy es mensual, no diario.** La hoja `bd`
de la planilla *Astilla verde* trae `mes` (`ene-2025`, `feb-2025`…) y
`Recepción`, pero **ninguna columna de fecha diaria**. Sin una
*Fecha Contab.* por día no existe "último día cerrado en SAP", y por lo
tanto no hay hueco que rellenar: la regla de complemento no tiene dónde
engancharse. Hace falta la descarga diaria de SAP del material
`3000039`.


`readPlan_` lee **solo la columna del mes calendario vigente**. Si en el
dashboard se mueve *Fecha desde* a otro mes, el plan que se compara
sigue siendo el del mes actual, y el desvío, el cumplimiento y la
proyección quedan mal sin ningún aviso en pantalla.

Mientras no se resuelva, usar el filtro de fechas por defecto (el mes
vigente, que es como carga). La solución de fondo es que `readPlan_`
devuelva `{ subproducto, mes, plan }` de todos los meses y que
`planForFilter()` sume los que toca el rango.

Otros puntos abiertos, menores:

- **Sin caché.** Cada carga relee las tres hojas. El dashboard MASISA de
  este repo ya resuelve esto con `putCacheChunked_` (`apps-script/Code.gs`).
- **Día parcial de SAP.** El complemento se descarta por día completo:
  si SAP cargó solo algunos proveedores del último día, se pierden los
  camiones de los que faltan. Cubrirlo requiere complementar por
  (fecha, proveedor) en vez de por fecha.
- **La UM de SAP no se valida** contra `CONFIG.UNIDAD`.

## Pruebas

```bash
cd astilla/pruebas && node prueba.js
```

Simula las globales de Apps Script y comprueba el rechazo de planillas
sin fecha, las variantes del asunto, los feriados en el prorrateo, el
inicio del complemento y la clasificación de sub-productos. No toca
Gmail ni el spreadsheet.
