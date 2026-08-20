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
| `Ingresos` | Registro real de recepción, por *Fecha Contab.* | Sí |
| `InformeAstilla` | La escribe el script con lo que extrae de los correos | La crea sola |
| `Plan` | `Suministro · Proveedor · Precio · <mes>` | Para plan y costo |
| `Mapeos` | Un aserradero por fila: nombre, coordenada y estado | Para el mapa |

Las columnas de `Ingresos` se detectan por nombre de encabezado
(*Fecha Contab.*, *Descripción Material*, *Cantidad*, *Proveedor*…). Si
la descarga viene sin encabezados, se usan las posiciones fijas de
`CONFIG.INGRESOS_COLUMNS`.

En `Plan`, la celda **Suministro** puede aparecer solo en la primera
fila del grupo y se arrastra hacia abajo. El **Precio** es unitario por
TS para esa combinación proveedor/material, y la columna del mes lleva
el volumen planificado. El mes se admite como `AGO-2026`, `2026-08` o
una fecha real.

## Sub-productos: SAP y la planilla no hablan igual

**La planilla** (el correo) desglosa en tres sub-productos; el resto
(aserrín, álamo, pino combustible) se ignora:

- `ASTILLA EUCALYPTUS NITENS`
- `AST. PINO VERDE C/ CORTEZA`
- `ASTILLA PINO VERDE`

**La hoja `Ingresos` los distingue por código de material**, que es la
homologación primaria y no admite ambigüedad:

| Código | Subproducto |
|---|---|
| `3000039` | `ASTILLA PINO VERDE` |
| `3009002` | `AST. PINO VERDE C/ CORTEZA` |
| `3009003` | `ASTILLA EUCALYPTUS NITENS` |

Si el código no está en `CONFIG.MATERIAL_MAP`, cae a la descripción del
material y el texto de posición. El reconocimiento tolera `AST.` vs
`ASTILLA`, plural, `C/ CORTEZA` vs `CON CORTEZA`, tildes y espacios
dobles.

## Precio y valorización

El cruce de precio es aparte del cruce operativo y a propósito más
conservador: conserva palabras como FORESTAL, ASERRADERO e INDUSTRIA
porque distinguen empresas de nombre parecido. **Si dos candidatos
quedan demasiado cerca, el precio no se asigna**: la fila queda visible
como «Precio ambiguo» y sus TS no se valorizan. Es preferible una
cobertura de precio menor a un costo con el precio equivocado.

El dashboard muestra siempre la **cobertura de precio**: qué porcentaje
de las TS tiene proveedor/material valorizado. Bajo 95% avisa.

## Qué correos entran

Solo el mensaje **original** de `reservador.horario@masisa.com` cuyo
asunto calce exactamente con:

```
PLANILLA CUMPLIMIENTO SUB-PRODUCTOS <DÍA> DD DE <MES> DE YYYY
```

Se excluyen respuestas (`Re:`), reenvíos (`RV:`, `Fwd:`), notas
internas y cualquier texto agregado al asunto. Dentro de la planilla se
descartan las filas «Total…» y las filas sin proveedor, porque son
sumas y duplicarían los camiones.

## El diseño

**Encabezado verde semioscuro** con el título fijo *Ingresos de astilla
verde* y un filete de madera al pie, como el de un membrete impreso: es
lo que ata los dos colores institucionales sin adornar. La línea bajo el
título cambia según la vista —el mes y los días hábiles en Suministro,
el conteo de aserraderos en Mapeos—, así que el encabezado siempre dice
dónde estás parado.

Debajo, área de trabajo blanca. Cada color del dato significa una sola
cosa y nada decorativo los usa:

| Color | Significa |
|---|---|
| Verde forestal | Ingreso real, confirmado en `Ingresos` |
| Madera (rayado) | Complemento estimado del reservador |
| Pizarra | Plan — una referencia, no un material |
| Ladrillo | Riesgo: bajo plan, o precio sin homologar |

El elemento central es **la regla del mes**: en el rubro todo se mide
—forcípula, romana, cinta diamétrica—, así que el mes se dibuja como un
instrumento. La escala es el plan, lo llenado es lo que entró, y las
dos marcas dicen dónde deberíamos ir hoy y dónde vamos a terminar al
ritmo actual.

Los gráficos se dibujan en SVG propio, sin librería: el aspecto por
defecto de una librería de charts se reconoce a un kilómetro.

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

### Cómo registrar un aserradero

Primero, una sola vez: **Astilla Dashboard › Preparar hoja de mapeos**.
Crea la hoja, pone la validación de Estado, asigna un `ID` correlativo
y rellena en `Por visitar` lo que esté en blanco. Se puede correr las
veces que sea.

Después hay dos caminos, y sirven para cosas distintas.

**Desde el dashboard, de a uno.** Pestaña *Mapeos* → botón
**Agregar aserradero**. Se abre el panel de la derecha:

| Campo | |
|---|---|
| Nombre | Obligatorio |
| Coordenadas | Pega lo de Google Maps. Es el camino corto |
| Dirección | Solo si no tienes la coordenada |
| Comuna | Ayuda a geocodificar la dirección |
| Contacto / Teléfono | Opcionales |

El `ID` y el estado inicial los pone el script. Si guardas sin
coordenada y la dirección no se puede ubicar, queda igual en el listado
marcado «sin ubicar» y el propio panel te ofrece **Fijar en el mapa**
para resolverlo con un clic. Es lo que conviene para el aserradero que
te acaban de mencionar por teléfono.

**Desde la hoja, en lote.** Abre `Mapeos` y pega las filas: basta
**Nombre** y **Coordenadas** (o **Dirección** + **Comuna**). Deja
`ID`, `Estado`, `Latitud` y `Longitud` en blanco. Luego:

1. **Preparar hoja de mapeos** — asigna los `ID` que falten y pone
   todo en `Por visitar`.
2. **Ubicar en el mapa** — por cada fila sin latitud usa primero la
   coordenada pegada y, solo si no hay, geocodifica la dirección.
   Nunca pisa una fila ya ubicada, y al terminar dice cuántas salieron
   por cada vía y cuáles quedaron pendientes.

Si pegaste la coordenada, el mapa **ya la dibuja** sin que corras el
paso 2; ese paso solo la deja escrita en `Latitud`/`Longitud` y
resuelve las que vienen solo con dirección.

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
