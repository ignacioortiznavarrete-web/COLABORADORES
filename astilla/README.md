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
| `Mapeos` | Un aserradero por fila: nombre, coordenada y estado | Para el mapa |

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

Hoja `Mapeos`, una fila por aserradero. Tú pones **Nombre** y, para
ubicarlo, o bien la **Coordenada** o bien la **Dirección**. El resto lo
maneja el dashboard.

### La coordenada manda

Un aserradero rural rara vez tiene una dirección que un geocodificador
resuelva bien: «Camino a Nacimiento s/n» termina en el centro de la
comuna, o derechamente en otra. Pegar el par que entrega Google Maps es
exacto, instantáneo y no depende de ningún servicio.

En Google Maps: **clic derecho sobre el punto → copiar coordenadas**, y
pegar en la columna `Coordenadas`. Se aceptan los formatos que la gente
pega de verdad:

```
-37.0331, -72.4015          decimal, el más común
-37.0331 -72.4015           separado por espacio
(-37.0331, -72.4015)        entre paréntesis
-37,0331 -72,4015           con coma decimal
37°01'59.2"S 72°24'05.4"W   grados, minutos y segundos
```

**Si pegas latitud y longitud al revés, se detecta y se corrige.** Es
el error más común y el más difícil de notar: no falla, solo deja el
pin en medio del Atlántico. Una coordenada que no cae en Chile en
ningún orden se rechaza y se informa, en vez de dibujarse mal.

No hace falta acordarse de correr nada: si pegas la coordenada, el
dashboard ya la dibuja. **Ubicar en el mapa** solo sirve para dejarla
escrita en `Latitud`/`Longitud` y para geocodificar las que solo tienen
dirección.

### Fijar con un clic

Para el aserradero que no tiene dirección en ningún callejero pero que
sabes exactamente dónde está: elígelo en el listado o en el mapa, y en
el panel de la derecha pulsa **Fijar en el mapa**. El siguiente clic
sobre el mapa guarda la coordenada (Esc cancela). Si ya está ubicado,
el botón dice **Mover**.

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

1. **Astilla Dashboard › Preparar hoja de mapeos.** Crea la hoja, pone
   la validación de Estado, asigna un `ID` correlativo a cada fila y
   rellena en `Por visitar` todo lo que esté en blanco. Si la hoja
   venía sin la columna `Coordenadas`, la agrega sin tocar lo escrito.
   Se puede correr las veces que sea.
2. Agrega tus aserraderos: nombre y coordenada. Si no tienes la
   coordenada, dirección y **comuna** (la comuna importa: hay «Camino a
   Nacimiento» en varias).
3. **Ubicar en el mapa.** Por cada fila sin latitud: primero usa la
   coordenada pegada, y solo si no hay, geocodifica la dirección.
   Nunca pisa una fila ya ubicada, y al terminar dice cuántas salieron
   por cada vía y cuáles quedaron pendientes.

Los que no se puedan ubicar siguen apareciendo en el listado —marcados
«sin ubicar»— y el dashboard dice cuántos son. Nunca se pierden por no
estar en el mapa.

Las columnas se resuelven **por nombre de encabezado**, no por
posición: puedes reordenar o agregar columnas en la hoja sin romper
nada.

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
| Ubicar en el mapa | Resuelve las filas sin ubicar: coordenada pegada primero, dirección después |

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
