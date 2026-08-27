# Dashboard Forestal · Histórico

Apps Script sobre el spreadsheet **Ingresos Historico**
(`1ZR7sTAOUa-Nk-pBzgO8-FLB4clyDawEnhxd8oqXcJs8`).

Reemplaza al dashboard histórico anterior. Mismo origen de datos y mismas reglas
de homologación (proveedores, predios, comunas → región), pero con analítica
comparativa y un panel de hallazgos accionables.

> Ojo: la carpeta `apps-script/` de este repo es **otro** dashboard, el del mes
> en curso, sobre el spreadsheet `1q_6ojGWI0OPjopobAIMtIdlRaLOHAMNyUhSKJzlSvgg`.
> Son proyectos separados y no comparten código.

---

## Instalación

Dos archivos, una sola vez.

1. En el spreadsheet: **Extensiones › Apps Script**.
2. Pega `Code.gs` sobre el archivo `Código.gs` que viene por defecto.
3. **Archivo nuevo › HTML**, nómbralo exactamente `Index`, y pega `Index.html`.
4. Guarda y recarga el spreadsheet. Aparece el menú **Ingresos › Abrir dashboard**.

Para publicarlo como web app: **Implementar › Nueva implementación › Aplicación web**.

Si algo no cuadra, ejecuta la función `diagnostico()` desde el editor: deja en el
log las filas leídas, las descartadas, el rango de fechas, cuántos proveedores y
viajes detectó, y qué columnas opcionales encontró.

---

## Qué cambió respecto de la versión anterior

### Análisis

| Antes | Ahora |
|---|---|
| Cubicación, plan y cumplimiento del periodo | Además: promedio, mediana, desviación, coeficiente de variación, tendencia con R², estacionalidad y proyección |
| Sin comparación temporal | Comparación contra el **mismo periodo del año anterior** o contra el **periodo inmediatamente anterior**, aplicada a todos los KPIs, tablas y gráficos |
| Un gráfico mensual | Serie mensual con plan y año anterior, líneas por año sobre el mismo eje de meses, matriz año × mes, acumulados año contra año, estacionalidad y Pareto |
| Tabla de proveedores con 7 columnas | 15 columnas: participación, acumulado Pareto, variación contra la base, mini-serie de 12 meses, CV, meses activos, días sin entregar y semáforo |
| — | Pestaña **Plan de acción** con hallazgos priorizados y acción sugerida para cada uno |
| — | Pestaña **Operación**: viajes, m³ por viaje, camiones, distribución diamétrica, largo, hora, día de semana, turno y estado |
| Filtros de selección única | Multi-selección con buscador en todos los filtros, más año, mes calendario, turno, estado, producto y rango de diámetro |
| — | Presets de periodo (último mes, últimos 3/6/12, año en curso, año anterior) |
| — | Exportación a CSV de la vista y del plan de acción |
| — | Cada gráfico se descarga como PNG, y un botón arma una presentación de Google Slides con todos |
| — | Tocar un mes despliega ese mes desglosado por proveedor, sin salir del Resumen |
| — | Tema claro y oscuro |

### Datos que antes se ignoraban

La planilla ya traía columnas que el dashboard anterior no leía. Ahora se usan:

- **Guía** → cuenta de viajes reales y m³ por viaje.
- **Hora** → curva horaria de recepción.
- **Turno** → comparación A/B.
- **Patente** → camiones distintos en el periodo.
- **Estado** y **Producto** → filtros y distribución.

Todas son opcionales: si la columna no está, el dashboard lo detecta
(`caps` en el bundle) y esconde esa métrica en vez de fallar.

### Correcciones

- **Meses de plan sin ingreso ya no desaparecían.** Antes el alcance del plan se
  derivaba de los meses *con datos*, así que un mes planificado sin ingresos
  quedaba fuera del total y el cumplimiento salía inflado. Ahora se deriva de la
  ventana de fechas.
- **El cumplimiento avisa cuando no es comparable.** El plan existe por
  proveedor, faena MASISA y mes. Si filtras por calidad, largo, diámetro, turno,
  estado, o por comuna/región cuando la hoja Plan no las trae, comparar el
  ingreso filtrado contra el plan completo no significa nada: el dashboard lo
  marca en pantalla en vez de mostrar un porcentaje engañoso.
- **Proveedor padre arrastrado correctamente en la hoja Plan.** Antes una fila
  con proveedor pero sin origen se saltaba *antes* de registrar el proveedor, y
  las filas siguientes se colgaban del proveedor equivocado.
- **Variación mensual con base cero.** Antes `(actual − 0) / 1` reportaba un
  porcentaje falso cuando el mes anterior era cero; ahora se muestra `–`.
- **Filas de totales de la hoja Plan** (`TOTAL`, `TOTALES`, `SUMA`) se descartan.
- **Los diccionarios de alias dejaron de estar duplicados** entre `Code.gs` y el
  HTML. Viajaban dos copias que podían quedar desfasadas; ahora el servidor los
  manda en el bundle.
- **Caché comprimida con gzip** antes de trocearla, lo que reduce mucho el número
  de claves de `CacheService` y hace que la caché aguante planillas grandes.

---

## Sistema visual

La regla de fondo es que **el cromo es acromático y el color queda reservado
para los datos**. Antes el verde significaba cinco cosas a la vez (marca,
ingresado, cumple, serie de región, proveedor estable), así que no significaba
ninguna. Ahora cada color tiene un solo trabajo.

### Color por rol

| Rol | Claro | Oscuro | Dónde aparece |
|---|---|---|---|
| Ingresado (real) | `#0f7a4a` | `#2fa36a` | barras de volumen, series de lo efectivamente recibido |
| Comparación | `#2a78d6` | `#4288d8` | periodo base, año anterior |
| Plan (meta) | tinta neutra | tinta neutra | línea de meta, marca en la regla y en las barras de tabla |
| Bajo plan | `#b0392c` | `#db6a5c` | brechas negativas |
| Cerca del plan | `#96690f` | `#c98500` | 90-100% de cumplimiento |

Las **calidades** toman el color real de la madera: verde en pie, violeta para
la mancha azul (que es el color que deja el hongo), rojo para el siniestrado.
Las **regiones** usan una paleta categórica de ocho tonos en orden fijo, de modo
que una región conserva su color aunque un filtro cambie el ranking.

Toda la paleta está verificada con el validador del skill `dataviz`: banda de
luminosidad, piso de croma, separación para daltonismo, piso de visión normal y
contraste contra la superficie, en claro y en oscuro. El contraste de texto se
audita en navegador sobre las cinco pestañas y los dos temas: 0 incumplimientos
de 4.5:1.

### Tipografía

IBM Plex Sans para la interfaz y **IBM Plex Mono para todas las cifras**. El
monoespaciado no es decorativo: alinea las columnas numéricas de las tablas y
hace que un número se lea como la lectura de un instrumento. La hoja de fuentes
se carga sin bloquear el render y hay pila de reserva, así que en una red
corporativa que bloquee Google Fonts el tablero se ve igual de ordenado.

### La regla

El primer elemento del Resumen es una regla graduada, no una barra de progreso.
El riel llega al 125% del plan y lleva marcas cada 25%, así que se puede leer el
cumplimiento sin mirar el número; la aguja marca la meta y el relleno se redondea
solo en el extremo del dato. Debajo van las tres cifras que importan (real, plan
y brecha) etiquetadas, con la brecha coloreada según el estado.

Reemplaza a tres tarjetas sueltas porque las tres respondían la misma pregunta.
El mismo gesto se repite dentro de la tabla de proveedores: cada barra lleva su
marca de meta, así que la fila se lee igual que el encabezado.

Sin plan cargado el riel desaparece en vez de quedar vacío: la celda pasa a
mostrar los m³ recibidos y nada más.

### Gráficos

- **Ningún gráfico de doble eje.** El Pareto de proveedores pone barras y
  acumulado en una sola escala 0-100%; viajes y carga media, que son medidas
  distintas, se separaron en dos gráficos.
- La **distribución diamétrica** muestra m³ por clase, sin línea de acumulado, y
  llega hasta 48 cm (`DIAM_MAX_GRAFICO` en `Index.html`). Las clases mayores son
  marginales y solo estiraban el eje; siguen contando en el diámetro medio, la
  mediana y los porcentajes de la nota, y ahí se indica cuánto volumen quedó
  fuera del gráfico.
- El plan dejó de ser una barra que compite con lo ingresado y pasó a ser una
  **línea de meta**; la barra de cada mes se pinta según su distancia al plan.
- Los años son una secuencia, no categorías: en las series por año el más
  reciente va en verde y grueso, y los anteriores se apagan hacia el fondo.
- La matriz año × mes usa una rampa secuencial de un solo tono.

### Accesibilidad y movimiento

Foco de teclado visible en todos los controles (aclarado sobre la cabecera
oscura), sin desplazamiento horizontal en 390 px, y `prefers-reduced-motion`
respetado: las transiciones se anulan sin que ningún contenido dependa de una
animación para aparecer.

---

## Abrir un mes por proveedor

En el gráfico mensual del Resumen, **tocar la barra de un mes despliega ese mes
desglosado por proveedor** justo debajo, sin quitar el gráfico de la vista: hace
falta seguir viendo el mes dentro de su serie mientras se mira quién lo compone.
Los nombres de mes de la tabla «Detalle mensual» abren el mismo detalle, así que
también se llega con teclado.

El detalle trae la regla del propio mes (real, plan, cumplimiento y brecha) y una
tabla por proveedor con m³, participación del mes, plan, brecha, cumplimiento,
variación contra el mismo mes del año anterior, viajes y carga media. Está
ordenada por volumen.

La barra de cada fila mide **participación en el mes**, la misma medida que la
columna de al lado; la marca de meta aparece cuando el plan de ese proveedor cabe
en esa escala. Si el plan queda fuera, la columna Brecha dice por cuánto.

Se cierra tocando el mismo mes otra vez, con el botón «Cerrar detalle» o con
`Esc`. Si cambias el periodo y el mes abierto deja de estar dentro, se cierra
solo. El botón «Ver este mes en Proveedores» acota el periodo a ese mes y salta a
la pestaña de proveedores, que es donde está el análisis completo.

---

## Llevar los gráficos a una presentación

Dos caminos, según lo que necesites.

**Un gráfico suelto.** Cada tarjeta tiene un botón `⤓ PNG` en su encabezado.
Descarga esa imagen y la pegas donde quieras.

**Todo de una vez.** El botón `▤ Slides` de la cabecera recorre las cinco
pestañas, captura los gráficos que tengan datos y arma una presentación de Google
Slides: portada con el periodo, la base de comparación y los filtros aplicados,
una lámina de resumen con las cifras clave, y después una lámina por gráfico con
su título y el periodo al pie. Al terminar abre la presentación en una pestaña
nueva. Queda en tu **Mi unidad**.

Un par de cosas que conviene saber:

- La captura usa `getImageURI()` de Google Charts, que solo entrega la imagen una
  vez que el gráfico terminó de dibujarse. Por eso el botón recorre las pestañas
  antes de exportar; verás el tablero cambiar de pestaña durante unos segundos.
- Solo se exportan los gráficos con datos: los que quedaron vacíos por el filtro
  no ocupan una lámina.
- **La primera vez pedirá un permiso nuevo** (crear y editar presentaciones de
  Google Slides), porque el script ahora usa `SlidesApp`. Si el tablero está
  publicado como aplicación web, hay que volver a implementarlo para que tome el
  permiso.
- Las imágenes viajan como PNG en base64 dentro de la llamada al servidor, así
  que con muchos gráficos la creación tarda unos segundos.

---

## Cómo leer los indicadores

**Coeficiente de variación (CV).** Desviación estándar dividida por el promedio
mensual. Bajo 35% el abastecimiento es estable; sobre 50% es muy irregular y
obliga a mantener stock de seguridad. Sirve para decidir con qué proveedores
conviene pasar de un compromiso de volumen total a un piso de entrega mensual.

**Tendencia y R².** Pendiente de la regresión lineal sobre los meses del periodo,
en m³ por mes. El R² dice cuánto confiar: bajo 0,3 la serie es demasiado
irregular y conviene mirar el promedio móvil de 3 meses del detalle mensual.

**Índice de estacionalidad.** Promedio de cada mes calendario dividido por el
promedio general de todo el historial filtrado, en base 100. Un 120 significa que
ese mes suele traer 20% más volumen que un mes cualquiera. Evita leer como caída
lo que solo es invierno.

**HHI (concentración).** Suma de los cuadrados de las participaciones de cada
proveedor. Sobre 0,18 la cartera está concentrada; sobre 0,25, la caída de un
solo proveedor deja un hueco que no se cubre dentro del mes.

**Prorrateo de mes parcial.** Si el periodo corta un mes por la mitad, el plan de
ese mes se escala por los días cubiertos. Se puede desactivar con la casilla
*Ajuste de plan*.

**Proyección.** Mitad tendencia lineal del periodo, mitad promedio ajustado por
estacionalidad. Es referencia de planificación, no compromiso.

**Viaje.** Una guía dentro de un día. Si la planilla no trae guía, se aproxima por
patente y día.

---

## Formato esperado

### Hoja 1

Obligatorias: `Cubicacion`, `Fecha`, `Proveedor`, `Predio`, `Comuna`.
Opcionales: `Cal.Trz`, `Calidad`, `Largo`, `Diametro`, `Cantidad`, `Hora`,
`Guia`, `Turno`, `Patente`, `Estado`, `Producto`, `Rol`.

`Cal.Trz` se traduce a calidad: `1` siniestrado, `2` verde, `3` manchado.

### Hoja Plan

Columnas `Proveedores` y `Origen`, más una columna por mes. Los encabezados de
mes se aceptan como fecha, como `2026-03`, o como `Mar-2026` / `Marzo 2026`.

`Origen` se interpreta como **faena** solo cuando el proveedor padre es
`MASISA SA` y el nombre está en `MASISA_FAENAS`. Para el resto de proveedores,
`Origen` es el proveedor.

Si además agregas una columna `Comuna` o `Region` a la hoja Plan, el cumplimiento
pasa a ser comparable también al filtrar por territorio; el dashboard lo detecta
solo.

---

## Personalización

Todo lo específico del negocio está al comienzo de `Code.gs`:

- `REGION_BY_COMUNA` — mapa comuna → región. Si aparece una comuna nueva, agrégala
  acá o caerá en «Sin región» (el plan de acción lo reporta).
- `REGION_BY_COMUNA_ROL` — excepciones resueltas por ROL cuando el nombre de
  comuna de la fuente es ambiguo o está mal escrito.
- `PROVIDER_ALIASES` / `PREDIO_ALIASES` — homologación de nombres.
- `MASISA_FAENAS` — faenas propias que se abren dentro de MASISA.
- `CONFIG.CACHE_PREFIX` — súbele la versión (`V16` → `V17`) para invalidar toda la
  caché de golpe después de cambiar la estructura del bundle.

---

## Rendimiento

El servidor arma un bundle columnar (arreglos paralelos con diccionarios de
etiquetas internados) y lo cachea comprimido. El cliente hace toda la agregación
en memoria en una sola pasada, así que cambiar un filtro no cuesta una llamada al
servidor.

Medido sobre 47.000 filas: carga inicial ~2 s, recálculo completo al mover un
filtro ~40 ms.
