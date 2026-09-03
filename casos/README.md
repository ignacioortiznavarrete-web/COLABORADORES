# casos — Año / Hoy / Días abiertos en la Planilla Yasna

Apps Script sobre la planilla **Planilla Yasna**
(`1FfRbv_jkU17hfGLlyQ7N-0RZmsCrW1txtroOFDmc41Y`), hoja **BD**.

Cada vez que se abre la planilla, el script deja tres columnas a partir de la **E**:

| Columna | Encabezado | Qué lleva |
| :-- | :-- | :-- |
| **E** | Año | El año de la **fecha de apertura** (columna B) |
| **F** | Hoy | La fecha del día en que se ejecuta el script |
| **G** | Días casos abiertos | Días entre la **fecha de apertura** y hoy |

Las tres se reescriben **completas** en cada ejecución: desde la fila 2 hasta la
última fila con casos, pisando lo que hubiera de antes. Y si más abajo quedaron
restos de una corrida anterior (filas que ya no tienen caso), se borran.

Si esas tres columnas **todavía no están**, se insertan en la E y **todo lo que
había desde la E hacia adelante se corre a la derecha**. No se pisa ningún dato.
Si ya están —como pasa hoy en la planilla, que tiene los encabezados
"año(llenarlo atravez de appscript on open)" y compañía— el script las reconoce,
les deja el nombre limpio y solo actualiza los valores. Correrlo dos veces no
duplica columnas.

Además arma un **tablero de análisis** con esos mismos datos: `Dashboard.html`.

El código son dos archivos: **`Codigo.gs`** (la lógica) y **`Dashboard.html`** (el tablero).

---

## Cómo se instala

Una sola vez.

### 1. Abre el editor

En la planilla: **Extensiones › Apps Script**.

### 2. Pega el código

Verás un archivo `Código.gs` con un `function myFunction() {}` vacío. Borra todo
y pega el contenido de **`Codigo.gs`** de esta carpeta. Guarda con `Ctrl+S`.

### 3. Revisa la zona horaria

En el editor, **⚙ Configuración del proyecto › Zona horaria**: déjala en
`(GMT-04:00) Santiago`. De ahí sale qué día es "hoy".

### 4. Autoriza el script

En el menú del editor elige la función `actualizarCasos` y dale **Ejecutar**.
Google va a pedir permiso la primera vez: **Revisar permisos › tu cuenta ›
Configuración avanzada › Ir a (nombre del proyecto) › Permitir**.

### 5. Vuelve a abrir la planilla

Ciérrala y ábrela de nuevo. Arriba aparece el menú **Casos** y las columnas
quedan llenas. De ahí en adelante se actualiza solo cada vez que se abre.

Si prefieres actualizarlas sin cerrar la planilla:
**Casos › Actualizar año / hoy / días**.

---

## El tablero

**Casos › Abrir tablero**, o el enlace de la aplicación web si la publicas. Lee la
hoja BD en el momento, no guarda copia de nada y responde cinco preguntas:

| Pregunta | Cómo la responde |
| :-- | :-- |
| ¿Cuánto lleva esperando cada caso abierto? | Una marca por caso sobre el eje de días, con la línea de los 90 y el más antiguo rotulado |
| ¿Entran más de los que cerramos? | Aperturas y cierres por mes, y la cola pendiente al cierre de cada mes |
| ¿Dónde se concentran? | Clientes ordenados por reclamos, con el peso de los 5 primeros |
| ¿Por qué reclaman? | Subcategoría y causa comercial, con el error de precio destacado |
| ¿Cuánto tardamos y quién los tiene? | Mediana y p90 de días hasta el cierre, y los abiertos por responsable |

Y una sección de **análisis a fondo** con tres pestañas, doce gráficos más:

| Pestaña | Qué hay |
| :-- | :-- |
| **Pricing** | Error de precio mes a mes (sobre el total comercial), clientes con más error de precio, qué pide el cliente, y causa comercial por año |
| **Respuesta** | Distribución de días hasta el cierre con mediana y p90, por dónde entra el caso y cuánto tarda cada origen, la cola por responsable y tramo de antigüedad, y comparación por tipo de caso |
| **Clientes** | Reincidencia (cuántos clientes tienen 1, 2, 3-5… casos), con cliente y sin cliente, la curva de concentración, y quién acumula más días de espera |
| **Tendencia** | Casos que entran mes a mes con media móvil de 3 meses, en qué meses del año entran, y la mediana de días hasta el cierre según el mes de apertura |
| **Calidad del dato** | Campos sin completar, filas que se contradicen entre el estado, las columnas Abierto/Cerrado y las fechas, y la lista de casos por revisar |

Solo se dibuja la pestaña visible: un gráfico oculto mide cero de ancho y saldría
mal. Los filtros de arriba las alcanzan a las tres.

Abajo queda la cola de trabajo: los casos abiertos, ordenables por cualquier
columna. Llega plegada en 8 filas, con **Ver los N casos** para abrirla entera.

Los filtros de arriba (año, estado, tipo, subcategoría, causa, requerimiento y búsqueda) reordenan
todo lo de abajo, incluidas las frases de hallazgo, que se recalculan solas: el
tablero dice en palabras lo que está mostrando. Cada gráfico tiene su botón
**Tabla** con los mismos números en texto.

Cada filtro es un **desplegable con lista de casillas**: se puede marcar más de
una opción en cada uno. Sin nada marcado entran todos; marcando *Producto* y
*Comercial* entran los dos, y el botón pasa a decir "2 elegidos". Cada opción
muestra cuántos casos tiene, y el panel trae *Marcar todo* y *Limpiar*. El panel
se cuelga del `<body>`: dentro de la barra, que se pliega con overflow oculto,
quedaría recortado. La barra de filtros se pliega con el botón **Filtros**, que muestra cuántos hay
puestos. En pantalla angosta llega plegada: son seis controles antes del primer
dato. El plegado queda recordado en el navegador.

**Abierto o cerrado lo decide la columna `Cerrado` (P)**: VERDADERO es cerrado,
FALSO abierto. Solo si esa celda viene en blanco el tablero mira el estado y la
fecha de cierre. El filtro **Tipo** sale de la columna `Tipo` (R), y si la hoja
trae un solo tipo, el título de arriba lo nombra.

### La cola de trabajo

Tiene su propia barra, independiente de los filtros de arriba:

- Un **desplegable** para elegir qué lista: *Abiertos*, *Cerrados* o *Todos*.
- Un **buscador propio** que mira dentro de la tabla —número, cliente,
  responsable, situación, tipo, subcategoría, causa y asunto— para llegar a
  cualquier caso de los 391 sin tocar los filtros del tablero.
- La columna **Días** dice días esperando si el caso está abierto, y días hasta
  el cierre si ya cerró.
- Un botón **Copiar** que se lleva al portapapeles **todas** las filas filtradas
  —no solo las ocho a la vista— con encabezados y separadas por tabuladores, que
  es lo que Sheets y Excel entienden como columnas al pegar. El botón dice
  cuántas va a copiar. Si el navegador bloquea el portapapeles moderno (pasa
  dentro del cuadro de Apps Script), usa el respaldo de siempre y avisa si aun
  así no pudo.

La primera columna es el **estado editable** de cada caso. Al cambiarlo, el
tablero escribe en la planilla:

| | Abierto (O) | Cerrado (P) | Fecha de cierre (C) |
| :-- | :-- | :-- | :-- |
| Poner en **Cerrado** | FALSO | VERDADERO | la fecha de hoy |
| Poner en **Abierto** | VERDADERO | FALSO | se borra |

Elegir de nuevo el estado que ya tiene no escribe nada: volver a marcar "Cerrado"
un caso ya cerrado le cambiaría su fecha de cierre por la de hoy.

Las tres celdas se escriben **imitando lo que ya hay en su columna**: si son
casillas de verificación escribe booleanos, si son texto escribe `VERDADERO` /
`FALSO` (o `TRUE` / `FALSE`), y la fecha con el mismo formato que sus vecinas.
Escribir texto donde hay casillas rompería la validación de la celda.

Reabrir borra la fecha de cierre —un caso abierto no puede tener una— así que
pide confirmación antes. El cambio se guarda con un candado de documento, para
que dos personas a la vez no se pisen.

> **Antes de publicar la aplicación web, decide quién puede escribir.** Con
> *Ejecutar como: yo*, el script escribe en la planilla **con tu cuenta**: quien
> tenga el enlace puede cerrar casos aunque no tenga acceso a la hoja. Tres
> salidas, según lo que necesites:
>
> - Publicar como *Ejecutar como: el usuario que accede*. Cada persona escribe
>   con su cuenta y necesita permiso de edición en la planilla.
> - Dejar `PERMITIR_EDICION: false` en `CFG_CASOS`. El tablero se sigue viendo,
>   pero el servidor rechaza cualquier escritura.
> - Restringir el acceso de la implementación a las personas que corresponda.
>
> `?lectura=1` **no** es un candado: esconde los controles, no cierra la puerta.
> Sirve para que el tablero no se toque sin querer, no para impedir que alguien
> decidido llame a la función.

### Instalarlo

1. En el editor de Apps Script: **Archivo › + › HTML**. Ponle de nombre
   `Dashboard` (Google le agrega el `.html` solo).
2. Borra lo que traiga y pega el contenido de **`Dashboard.html`** de esta carpeta.
3. Guarda y vuelve a abrir la planilla: aparece **Casos › Abrir tablero**.

Para tener un enlace que se pueda compartir sin entrar a la planilla:
**Implementar › Nueva implementación › Aplicación web**, ejecutando como tú y con
el acceso que corresponda. Esa URL abre el mismo tablero.

### Solo lectura

Agregando **`?lectura=1`** al enlace de la aplicación web, el tablero se abre sin
un solo control: sin filtros, sin ordenar, sin botones de tabla, sin plegado y sin
cambio de tema. La cola de trabajo se muestra completa y los globos de datos
siguen funcionando al tocar. Es el enlace para mandar por mensaje o para dejar
abierto en el teléfono:

```
https://script.google.com/…/exec?lectura=1
```

Fuera de Google, la misma copia se arma con `node casos/preview/construir.js --lectura`.

### En el teléfono

Probado en pantalla de 390 px con Safari en mente:

- Los campos usan 16 px en pantallas táctiles. Con menos, Safari hace zoom al
  tocar un campo y ya no vuelve.
- El ancho de cada gráfico se mide con `getBoundingClientRect`: Safari no
  implementa `clientWidth` en un `<svg>` y devuelve 0, lo que dejaba los gráficos
  con el ancho equivocado.
- Sin cursor no hay "pasar por encima": un toque abre el globo de datos y un
  toque al lado lo cierra.
- Los márgenes respetan el área segura del notch y el texto no se infla al girar
  el teléfono.

### Verlo fuera de Google

```
node casos/preview/construir.js
```

Escribe `casos/preview/tablero-demo.html`, que se abre con doble clic. Con
`--lectura` escribe `tablero-lectura.html`, la copia sin controles. Usa
`datos-ejemplo.json`, que tiene la forma y los números de la planilla real con los
nombres de clientes y personas enmascarados: los datos de clientes no viven en el
repositorio. Para verlo con los datos de verdad, pásale tu propio JSON:

```
node casos/preview/construir.js mis-datos.json salida.html
```

`Dashboard.html` no tiene nada de Google adentro: espera encontrar el texto
`__DATOS__` y cambiarlo por el JSON de los casos. Eso es exactamente lo que hace
`doGet` en el servidor, así que el archivo del tablero es uno solo.

### Detalles del tablero

- Todo el cálculo pasa en el navegador: el servidor solo manda las filas. Con el
  tamaño actual (391 casos, unos 100 KB de JSON) va instantáneo; si la hoja
  creciera a decenas de miles de filas habría que agregar del lado del servidor.
- Los colores de los gráficos están validados para daltonismo y contraste en modo
  claro y oscuro, y el tablero sigue el tema del sistema con un botón para forzar
  uno u otro. El rosa es el color de serie, no un adorno: se eligió midiendo. Ojo
  si se cambia la paleta a mano — rosa y verde azulado, por ejemplo, se ven
  idénticos con daltonismo (ΔE 2,8), y por eso el segundo color es azul. El
  umbral de los 90 días va en café (`--tarde`): oscuro en modo claro, café con
  leche en oscuro, porque sobre fondo negro un café oscuro no alcanza contraste
  y uno claro se confunde con el morado de la línea de pendientes.
- La línea de pendientes va en morado y por eso salió de la leyenda compartida:
  sobre fondo oscuro ningún morado se distingue del azul de los cierres (ΔE 1,7
  con protanopia). Es la única serie de su propio sub-gráfico, con el rótulo
  pegado al trazo, así que no tiene que competir con nadie.
- Fuera de Google (vista previa o copia estática) el estado se puede cambiar y
  el tablero reacciona, pero avisa que no se escribió en ninguna planilla: no
  hay dónde.
- **El primer gráfico siempre es una marca por caso, con cientos también.** Lo
  que se adapta es cómo se colocan: decenas de casos comparten fecha de apertura
  y caerían todos en el mismo punto del eje, así que cuando una columna se llena,
  las que sobran se corren a la columna libre más cercana, en abanico. El
  desplazamiento es de unos pocos días sobre cientos, y a cambio nunca hay
  columnas desbordadas ni etiquetas "+N". El tamaño de la marca solo se reduce si
  el conjunto entero no cabe.
- **El tablero es ancho a propósito** (`max-width: 1760px` en `.envoltura`). Los
  gráficos de esta clase se leen mucho mejor con sitio: más ancho son más
  columnas, y más columnas son columnas más bajas.
- **La tipografía se cambia en un solo lugar.** Arriba de `Dashboard.html`, en
  `:root`, hay tres variables y ninguna otra regla nombra una fuente:

  ```css
  --tipo-titulo: "Bricolage Grotesque", ...;  /* titulares y preguntas */
  --tipo-texto:  Outfit, ...;                 /* todo el texto y la interfaz */
  --tipo-dato:   "DM Mono", ...;              /* números, ejes y tablas */
  ```

  Cambiarlas es cambiar esas tres líneas y el `<link>` de Google Fonts de más
  arriba. Deja siempre una alternativa del sistema al final de cada lista, por si
  la fuente no carga.
- La entrada de los gráficos corre una sola vez, al cargar. Al filtrar solo se
  funden con su nueva forma, para que mover un filtro no dispare toda la
  coreografía otra vez.
- **Falta el monto.** El 92% de los casos termina en nota de crédito, pero la base
  no trae cuánto. Sin esa columna se pueden contar reclamos, no pesarlos. Agregar
  el monto de la NC a la hoja convierte este tablero en uno de margen; el tablero
  lo dice al pie para que no se olvide.

---

## Lo que se puede cambiar

Todo está arriba del archivo, en `CFG_CASOS`:

```js
var CFG_CASOS = {
  NOMBRE_HOJA: 'BD',            // nombre de la pestaña; vacío = la primera hoja
  COL_FECHA_APERTURA: 2,        // 2 = B
  COL_INICIO: 5,                // 5 = E, donde se insertan las tres columnas
  ENCABEZADOS: ['Año', 'Hoy', 'Días casos abiertos'],
  CLAVES: ['ano', 'hoy', 'dia'],
  FORMATO_FECHA: 'dd/mm/yyyy',
  USAR_FORMULAS: false,
  EJECUTAR_AL_ABRIR: true
};
```

- **`NOMBRE_HOJA`** es el nombre de la pestaña. Si se la vuelven a renombrar, el
  script avisa (`No existe la hoja "BD" en esta planilla.`, en *Ejecuciones* del
  editor) en vez de escribir en la hoja equivocada: basta con corregir esta línea.
- **`CLAVES`** es con qué empieza el encabezado para dar la columna por existente.
  Se compara en minúsculas y sin tildes, así que `año(llenarlo atravez de
  appscript on open)` cuenta como la columna `Año`. Las tres tienen que calzar
  seguidas para que el script las reconozca; si no, inserta columnas nuevas.
- **`USAR_FORMULAS: false`** escribe valores fijos, calculados en el momento:
  la columna *Hoy* y la de *días* siempre van a juego, y la hoja no se recalcula
  a cada rato. Ponlo en `true` si prefieres fórmulas vivas
  (`=AÑO(B2)`, `=HOY()`, `=HOY()-B2`); con muchas filas la hoja se pone más lenta,
  porque `HOY()` es volátil.
- **`EJECUTAR_AL_ABRIR: false`** deja el menú, pero no actualiza nada al abrir.

---

## Detalles que conviene saber

- La columna B se lee aunque tenga la fecha como texto (`26/12/2023`, `23/1/2024`,
  `2023-12-26`, `26/12/2023, 12:49`) o como número de serie de Sheets. Si la celda
  está vacía o no se entiende, *Año* y *Días* quedan en blanco y *Hoy* se escribe igual.
- **Días** es `hoy − fecha de apertura`, esté el caso cerrado o no. Sale negativo
  si la apertura es a futuro.
- Hasta dónde llega el relleno se decide mirando **solo las columnas que no son
  del script**. Si se contara la propia columna *Hoy*, la hoja se estiraría sola
  una corrida tras otra.
- Quien abra la planilla **solo como lector** no rompe nada: el menú aparece, la
  actualización falla en silencio y queda anotada en *Ejecuciones* del editor.
- `onOpen` es un activador simple: Google le da 30 segundos. Con el tamaño actual
  de la planilla sobra (es una sola lectura y una sola escritura), pero si algún
  día se queda corto, usa el menú o crea un activador instalable por tiempo.

---

## Pruebas

```
node casos/pruebas/test.js
```

También comprueban lo que el tablero recibe de la hoja: que "Estado" no se lo
lleve "Estado caso", que las fechas de texto salgan en ISO y que las filas vacías
no se cuelen. Simulan la hoja BD —con y sin las columnas— y comprueban que las columnas se
inserten corriendo el resto a la derecha, que el año y los días salgan de la
apertura y no del cierre, que la columna *Hoy* se reescriba entera (pisando
valores viejos y limpiando los restos de abajo), que correr el script dos veces
no duplique nada, y la cuenta de días: del 26/12/2023 al 02/09/2026 hay 981 días.
