# astilla — SAP vs planilla de sub-productos

Dashboard de **astilla verde** en toneladas secas (TS), sobre el
spreadsheet `1PNQToRtF7g-obmmOHuoonNGN5-VhhTYnW6SEhK36EOk`.

Replica la lógica de complemento de MetroRuma: **SAP manda siempre**, y
la planilla que llega por correo solo tapa el hueco de los días que SAP
todavía no contabiliza.

---

## Un camión no son 11 TS

Lo eran para todo, y esa era una cifra de oficina. Un camión carga
distinto según lo que trae:

| Código SAP | Material | TS por camión |
|---|---|---|
| `3009003` | Astilla eucalyptus nitens | **15,2** |
| `3000039` | Astilla pino verde | **11** |
| `3009002` | Astilla pino verde c/corteza | **10,7** |

Usar 11 para todo desinflaba el nitens un 28% y sobrestimaba la corteza
un 3% en **cada día complementado desde la planilla**.

**El material manda.** La columna `Factor` de `InformeAstilla` es
informativa: se reescribe en cada importación y el dashboard no la lee,
deriva el factor del material. Así la corrección alcanza también a las
filas importadas antes, sin reconstruir el historial.

---

## La regla, en una línea

Hasta la última *Fecha Contab.* se usan solo los datos de SAP. Desde el
día siguiente y hasta la última planilla recibida se usa
`CAMIONES × el factor del material`. Cuando SAP avanza, el estimado de ese día
desaparece solo.

## Las hojas

| Hoja | Qué contiene | ¿Obligatoria? |
|---|---|---|
| `Ingresos` | Registro real de recepción, por *Fecha Contab.* | Sí |
| `InformeAstilla` | La escribe el script con lo que extrae de los correos | La crea sola |
| `Plan` | `Suministro · Proveedor · Precio · <mes>` | Para plan y costo |
| `Apuntes` | Una fila por reunión: fecha, tema, asunto, acuerdos | Opcional |
| `Proveedores` | Equivalencias: cada forma de escribir un proveedor apunta a su nombre en SAP | Recomendada |
| `Mapeos` | Un aserradero por fila: nombre, coordenada y estado | Para el mapa |
| `Rutas` | Una ruta de visita por fila, con sus paradas y su evento | La crea sola |

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

### El detalle al pasar el mouse

Cada gráfico se lee de dos maneras: la forma de lejos, el número de
cerca. Al poner el cursor encima aparece un panel con lo que hay detrás
de ese punto, y **no solo el valor: también contra qué se compara**.

| Gráfico | Qué sale al pasar por encima |
|---|---|
| Avance acumulado | Guía vertical y punto sobre la serie. Acumulado, lo que entró ese día, plan a la fecha y desvío. En los días futuros, el proyectado y a qué ritmo |
| Ingreso diario | Recibido, estimado, total, plan del día, desvío, y a cuántos camiones equivale lo estimado |
| Reparto por producto | Volumen, participación, recibido contra estimado, plan del período y desvío. Funciona sobre la barra y sobre la leyenda |
| Precio vs volumen | Precio, cuánto se aleja del promedio, costo del período y, si no tiene precio, **por qué no lo tiene** |
| Pareto | Nombre completo del proveedor —que en el eje va cortado—, participación, acumulado, camiones, precio medio y hace cuánto no despacha |

Tres detalles que importan:

- La zona sensible es **la columna completa**, no la barra. Apuntarle a
  una barra de un pixel es imposible; a su columna, no.
- Lo que no está bajo el cursor **se apaga**, para que el dato apuntado
  quede solo.
- El panel **se voltea** al acercarse al borde en vez de salirse de la
  pantalla, y se apaga al desplazar la página.

En el gráfico de precio, cuando falta el precio el panel dice el motivo
—`Proveedor sin precio homologado`, `Precio ambiguo`, `Precio duplicado
en el Plan`—, que es lo que decide si hay que arreglarlo en
`Proveedores` o en el Plan.

## Proveedores: un mismo aserradero, tres nombres

El mismo proveedor llega escrito distinto en cada parte. En SAP
`LAMINADORA LOS ANGELES S.A.`, en la planilla `Laminadora Los Angeles`
y en el Plan, `LLASA`. Los dos primeros los junta el parecido. El
tercero no se parece en nada y **ningún algoritmo lo va a adivinar**:
sin ayuda, esas toneladas se quedan sin precio.

Para eso está la hoja `Proveedores`. Es una tabla de equivalencias
escrita a mano, y **lo que dice ahí manda sobre el parecido**, sin
umbrales de por medio.

**El nombre bueno es siempre el de SAP.** Es el único que viene del
sistema de origen; los demás son formas de escribirlo.

| Columna | |
|---|---|
| Proveedor SAP | El nombre que se conserva. Trae la lista de SAP en un desplegable |
| Alias | Una forma de escribirlo. Una por fila |
| Origen | Dónde viste ese alias: `SAP`, `Planilla`, `Plan`. Solo etiqueta |
| Notas | Para ti |

Así queda el ejemplo:

| Proveedor SAP | Alias | Origen |
|---|---|---|
| LAMINADORA LOS ANGELES S.A. | LAMINADORA LOS ANGELES | Planilla |
| | LLASA | Plan |
| | Laminadora Los Ángeles | Planilla |
| *(fila en blanco)* | | |
| PROMASA S.A. | PROMASA SPA | Planilla |

**Proveedor SAP** se arrastra hacia abajo, igual que `Suministro` en el
Plan: basta escribirlo en la primera fila del grupo. **Una fila en
blanco corta el arrastre** y separa un grupo del siguiente — sin eso,
el primer alias del grupo siguiente se colgaría del anterior sin que
nadie lo note.

No importan mayúsculas, tildes ni espacios de más.

### Cómo llenarla

Corre **Astilla Dashboard › Preparar hoja de proveedores**. No te deja
una hoja vacía: la siembra con **los nombres que hoy no cruzan** —los
de planilla sin par en SAP, los que se quedaron sin precio y los del
Plan que no calzan con ningún proveedor—, marcados en café al final.

Al lado de cada uno escribes el proveedor SAP que le corresponde, y
**borras los que no sean equivalencias reales**. Puedes correrlo las
veces que quieras: nunca repite un alias que ya esté escrito.

### La propuesta ya escrita

**Astilla Dashboard › Rellenar proveedores sugeridos** escribe una
propuesta de asociaciones sacada de los nombres que hoy están en el
Plan y en `InformeAstilla`: Llasa con Laminadora Los Ángeles, Javier
Pezoa con `FOR.JAVIER PEZOA GUTIERREZ E.I.R.L`, Biomasa Sur con
Biomasas Sur, Chiplumber con Chip Lumber, y así.

**No pisa nada.** Si un alias ya tiene su proveedor escrito, se
respeta. Solo rellena las filas que quedaron esperando y agrega al
final las que faltaban. Correrla dos veces no duplica nada.

El canónico que propone es **el nombre del Plan** cuando existe: es el
que viene con forma de maestro SAP (`FOR.`, `INMOB`, campos cortados a
30 caracteres). Donde el Plan no tiene al proveedor, el canónico es
provisional y lo dice en la nota.

Es una propuesta, no una verdad. Revísala.

### Qué hace con eso

En tres lugares a la vez:

1. **Unifica SAP consigo mismo.** La misma empresa dada de alta dos
   veces —con y sin `S.A.`— se suma como un solo proveedor en todo el
   dashboard.
2. **Cruza la planilla con SAP.** El nombre del correo pasa a ser el de
   SAP, y la fila queda marcada `Homologado a mano`.
3. **Encuentra el precio del Plan.** Si el nombre operativo y el del
   Plan llevan al mismo proveedor SAP, el precio se asigna: en la tabla
   de precios aparece como `Precio homologado a mano`.

### El arrastre tiene un filo

Rellenar un proveedor a media lista tiene un efecto que no se ve: las
filas de abajo que quedaron en blanco pasan a colgarse de él. Por eso
el sembrado deja una fila en blanco antes del bloque de pendientes, y
por eso **Rellenar proveedores sugeridos** separa con una fila en
blanco cada alias que quedó sin resolver.

Si escribes a mano, la regla es la misma: **fila en blanco entre grupo
y grupo**.

### Cuando la hoja no alcanza

Dos casos que **no se resuelven solos**, y el script prefiere decirlo a
inventar una cifra:

- **Un alias apuntando a dos proveedores distintos.** Gana el primero y
  el choque se informa. Dejar que ganara el último cambiaría las cifras
  según cómo estén ordenadas las filas.
- **Dos filas del Plan con el mismo proveedor y material pero distinto
  precio.** Eso no lo arregla una tabla de equivalencias: hay que
  corregir el Plan. Queda como `Precio duplicado en el Plan`, sin
  precio asignado.

Y un tercero, que ni siquiera es de nombres: **un proveedor que no
está en el Plan** —o que está pero no para ese material— no va a tener
precio por mucho que lo homologues. Hoy es el caso de Agrifor, Fátima,
Río Cruces, Asermain San Ignacio, y de Aitue en nitens.

Ambos salen en **Diagnosticar cruce SAP vs planilla**, junto con los
alias que escribiste y todavía no tienen su proveedor SAP al lado.

---

## Plan de acción

El dashboard ya dice qué pasa. El panel **Plan de acción** dice qué
hacer, y con qué argumento: sirve de poco saber que un proveedor cayó
40% si al llamarlo no tienes a mano por qué le conviene volver.

Cada punto responde tres cosas:

- **Por qué** — el dato que lo dispara, con cifras
- **Hacer** — el paso concreto, no un consejo genérico
- **Decirle** — el argumento frente al proveedor

Los casos que detecta:

| Caso | Cuándo salta |
|---|---|
| Dejó de despachar | Sin entregar hace 7 días o más |
| Viene a la baja | Cayó 25% o más entre las dos últimas semanas |
| Bajo su plan | Va por debajo de lo comprometido a la fecha |
| Comprometido y sin entregar | Tiene plan del mes y cero despachos |
| Precio sobre el promedio y bajo plan | Cobra caro y además no cumple |
| Barato y cumpliendo | Entrega al día bajo el precio medio |
| Sobre su plan | Va por encima de lo comprometido |
| Sin confirmar en SAP | Todo su volumen viene de la planilla |
| Sin precio homologado | Sus TS quedan fuera del costo |
| Despacha a saltos | Concentra el volumen en pocos días |
| Dependencia concentrada | Los tres primeros pasan del 60% |
| Brecha total del mes | Cuánto falta y cuánto por semana |

**Una tarjeta por proveedor**, no por punto: cinco viñetas del mismo
aserradero no son cinco tareas, son una conversación. Manda la más
grave y el resto queda plegado debajo.

Se filtra por *crítico · atención · oportunidad*.

---

## Apuntes: la vista de la reunión

El acuerdo que no queda escrito se convierte en *"me parece que
quedamos en"* tres semanas después, y ahí ya no hay conversación
posible.

**Apuntes** es la tercera vista, junto a *Suministro* y *Mapeos*. No es
un formulario en blanco: **te hace las preguntas**, y no siempre las
mismas.

### La pauta la decide el mes

Preguntar por el stock el día que el problema es la cancha llena es
perder el tiempo de todos. Por eso la pauta se arma según cómo viene el
mes, mirando la proyección al cierre contra el plan:

| Situación | Cuándo | Qué pregunta |
|---|---|---|
| **Llega más de lo planificado** | Proyección ≥ 108% del plan | Si hay cancha para lo que sobra, a quién bajarle volumen y cómo decírselo, si se aprovecha para renegociar precio a la baja, si el plan del mes siguiente se ajusta |
| **En línea** | Entre 95% y 108% | Si alguien avisó que baja, qué se hace con la diferencia del cierre, si el plan siguiente ya está conversado |
| **Falta para llegar** | Proyección ≤ 95% | De dónde salen las TS que faltan, quién puede subir y a qué costo, si se autoriza pagar sobre el precio medio, si se abre proveedor nuevo, y qué se hace en planta si no se cierra |
| **Sin plan comparable** | No hay plan del mes vigente | Si está cargado el plan, cuál es la meta y quién la comprometió |

Cada pregunta trae **su dato al lado**. «¿Quién puede subir esta
semana?» va acompañada del ritmo requerido contra el ritmo actual, para
no tener que buscarlo.

### Los otros dos bloques

**Seguimiento de la reunión anterior** — los apuntes que quedaron sin
cerrar vuelven a aparecer con su acuerdo escrito. Sin esto un acuerdo
se repite tres semanas seguidas sin que nadie note que nunca se
cumplió.

**Proveedor por proveedor** — sale del plan de acción, en el mismo
orden de prioridad. Cada caso trae su pregunta: al que *viene a la
baja* se le pregunta el motivo y hasta cuándo dura; al que va *bajo su
plan*, a cuánto por semana se compromete y desde cuándo; al que está
*sobre plan*, si se le sube el plan del mes siguiente.

Lo que no es pregunta de reunión no aparece: *sin precio homologado* se
arregla en la hoja, no conversando.

### Cerrar la reunión

Lo respondido se vuelca al apunte **con la pregunta delante**: dentro
de un mes la respuesta suelta no se entiende. Lo que escribas a mano en
«Apuntes» manda y la pauta se agrega debajo.

Las respuestas sobreviven a cambiar de vista mientras no cierres: media
reunión no se pierde por ir a mirar un gráfico.

La ficha guarda fecha, tema, asunto, participantes, apuntes, acuerdos,
responsable, compromiso y estado.

**La semana se calcula sola** a partir de la fecha, en formato ISO
(`2026-S35`). Por eso una reunión que se corre del lunes al miércoles
sigue siendo la de esa semana, y las fichas quedan agrupadas sin que
tengas que escribir nada.

Si la hoja no existe, la sección lo dice y el resto del dashboard sigue
funcionando: los apuntes no pueden tumbar el control de suministro.

---

## Filtrar y ordenar proveedores

La tabla **Precio, plan y cantidad por proveedor** son decenas de
cruces, y casi siempre se entra a ella buscando una sola cosa. Sobre la
tabla hay cuatro mandos:

- **Buscar** por proveedor, proveedor del Plan o subproducto. Ignora
  tildes y mayúsculas.
- **Brecha**: bajo plan · sobre plan · sin plan · sin precio.
- **Ordenar por**: cantidad, brecha, precio, plan del mes, costo
  valorizado o proveedor.
- **Sentido**: mayor a menor, o al revés.

Los nulos van siempre al final, se ordene como se ordene: un *sin
precio* no es un precio de cero. El total del pie suma lo filtrado, no
la tabla completa, y el rótulo dice cuántos cruces quedaron de cuántos.

---

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

## Rutas de visita

Un aserradero suelto en el mapa no sirve de mucho: la pregunta real es
si los cuatro que quieres ver caben en un día. Eso es lo que arma esta
parte.

En la pestaña *Mapeos*, botón **Armar ruta**. Vas haciendo clic en los
aserraderos —en el mapa o en el listado— y se van sumando como paradas
numeradas; los que quedan fuera se apagan para que se lea la ruta de
un vistazo. Cada parada se puede subir, bajar o sacar, y
**Ordenar por cercanía** propone un orden partiendo del más próximo a
la planta.

Mientras editas, el panel muestra el recorrido en kilómetros, la
duración estimada y la hora de término. Al guardar, la ruta queda en la
hoja `Rutas` y **se agenda sola en tu calendario**.

### De dónde sale el tiempo

| | |
|---|---|
| Origen | Planta Cabrero, ida y vuelta |
| Velocidad | 55 km/h |
| Factor de camino | 1,35 sobre la línea recta |
| Visita | 45 min por aserradero |
| Salida | 08:30 por defecto |
| Jornada | 9 h; si se pasa, el panel avisa |

**Es un aproximado y hay que leerlo como tal.** La distancia es en
línea recta corregida por un factor, no ruteo real: no sabe de curvas,
de la cuesta ni de un camino de tierra. Sirve para decidir si una ruta
cabe en el día, no para prometerle una hora exacta a nadie. El evento
del calendario lo dice en su propia descripción.

Las paradas sin coordenada no entran en el cálculo —no se las inventa
ubicadas en el mar— y el panel avisa cuántas quedaron fuera.

### El evento del calendario

Es **uno solo por ruta**: un bloque desde la salida hasta el término,
en tu calendario principal, con el itinerario completo en la
descripción —cada parada con su hora de llegada, su hora de salida y
los kilómetros del tramo—. No un evento por aserradero.

Si editas la ruta y la vuelves a guardar, **se actualiza el mismo
evento** en vez de crear otro; el `ID` del evento queda guardado en la
hoja. Borrar la ruta borra también su evento.

Si el calendario falla o faltan permisos, la ruta **igual se guarda**:
queda como `Sin agendar` y te dice por qué. Nunca se pierde el trabajo
de armarla por un problema de calendario.

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

La primera vez que guardes una ruta, Apps Script pedirá permiso de
**Calendario**: es para crear el bloque de la visita. Si lo rechazas,
las rutas se siguen guardando como `Sin agendar`.

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
| Preparar hoja de proveedores | Crea/repara `Proveedores` y siembra los nombres que hoy no cruzan |
| Rellenar proveedores sugeridos | Escribe la propuesta de equivalencias sin pisar lo que ya decidiste |
| Preparar hoja de rutas | Crea/repara `Rutas` con sus encabezados |
| Preparar hoja de apuntes | Crea/repara `Apuntes` para las reuniones |

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
inicio del complemento, la clasificación de sub-productos, la lectura
de coordenadas —decimales, DMS, pares invertidos y puntos fuera de
Chile—, la homologación de proveedores —arrastre, alias repetidos,
cadenas y el cruce de precio—, la estimación de tiempo de las rutas y
las validaciones que corren antes de escribir. No toca Gmail ni el spreadsheet.
