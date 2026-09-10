# registromaderas — Registro de requerimientos (PT · PCP · PP)

Apps Script sobre el spreadsheet **Maderas**
(`15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE`).

Se pegan los códigos, uno por línea, y salen sus filas de batch input listas
para SAP. Del código se deduce todo lo que el código ya dice; lo único que hay
que completar son las hojas de ruta.

```
RVMH  +  032 X 180 X 3960   ->   RVMH032X180X3960
└──┬─┘   └─┬─┘   └┬┘   └─┬┘
prefijo  espesor ancho  largo
```

La pantalla web solo **registra**. El batch input no tiene interfaz: vive en el
spreadsheet, y se baja como Excel desde su menú con las filas que dejes
seleccionadas en PT, PCP o PP.

---

## Cómo está armado el código

Los cuatro caracteres del prefijo salen de la hoja *MAderas Trading Estructura*:

| Posición | Qué dice | Ejemplos |
|---|---|---|
| 1 | Elaboración | `C` Cepillado · `R` Rústico |
| 2 | Estado | `V` Verde · `S` Estufada · `2`/`3`/`4` caras · `B` CTS Bisel · `C` CTS |
| 3 | Calidad | `M` Médula · `J` COL B · `K` Primera · `N` Mill Run · `F` COL MIX … |
| 4 | Especie | `H` Radiata Terceros · `R` Radiata EERR · `« »` producto en proceso |

Después van espesor (3 dígitos), `X`, ancho (3) y, si el producto lo lleva, `X`
y largo (4). Con largo el código mide **16 caracteres**; sin largo, **11**. Los
ceros a la izquierda los pone el formulario: escribes `32` y queda `032`.

De las 41.816 filas de `BD_Maderas`, 40.066 siguen exactamente este patrón.

## Lo que el código dice solo

Nada de esto se pregunta:

| En el código | Se deduce |
|---|---|
| Especie `H` (4º carácter) | Es madera de terceros: **Trading**, centro **TCD2** |
| Cualquier otra especie | **Planta**, centro **TCP1** |
| Empieza en `C` | Es cepillado: pide **las tres** hojas de ruta, sea de Trading o no |
| Especie `H` y **no** empieza en `C` | Se compra hecha: **sin ninguna** hoja de ruta |
| Lleva largo (16 caracteres) | Producto terminado: **PT** |
| Tres letras y sin largo | Producto de proceso: **PP** |
| Tres letras, sin largo y empieza en `C` | Cepillado en proceso: **PCP** |

La clase queda editable en la tabla por si algún caso no calza.

## Las condicionales

Todo lo que el formulario decide solo sale de tus propias hojas:

**`BD_Maderas` es la única hoja que se consulta.** No hay catálogos aparte.

| Decisión | De dónde sale |
|---|---|
| Si el material es de **Trading** | Carácter 4 = `H`, Radiata Terceros: se compra a terceros |
| Si hay etapa de **cepillado** | Carácter 1 del prefijo: solo si es `C`, y entonces van las tres |
| Si lleva **hoja de ruta** | Trading no lleva ninguna —salvo que empiece en `C`— porque se compra hecha |
| Si hay etapa de **secado** | Carácter 2: no la hay si es `V` (verde) |
| Etapa de **aserradero** | Va siempre, salvo en Trading |
| Si una ruta **sirve** para el producto | Su escuadría no puede ser más chica que la del producto |
| Si el prefijo vale | Si ya hay materiales de esa familia en `BD_Maderas`; si no, basta con que la nomenclatura explique sus cuatro caracteres |
| Qué hojas de ruta se ofrecen | Las que `BD_Maderas` tiene para esa escuadría |
| A qué etapa pertenece una ruta | Sus dos primeros caracteres: `RV` aserradero, `RS` secado, `C` cepillado |

## Las dos comprobaciones contra la base

Se consulta `BD_Maderas` dos veces, y para cosas opuestas. Conviene no
confundirlas:

| Qué | Regla | Por qué |
|---|---|---|
| El **código** que se pide | **No** debe existir | El batch input lo crea. Si ya está, no hay nada que crear |
| Las **hojas de ruta** que referencia | **Sí** deben existir | Son materiales de proceso ya dados de alta |

Si el código ya existe, el formulario lo dice con su descripción y no deja
seguir. Y para no chocar, muestra qué largos de esa escuadría ya están creados.

La ruta se escribe como **tres letras, un espacio y la escuadría**: `RVM 019X020`.
Así es el 89% de las que hay en la base. Las de cuatro letras (`RVFD032X180`)
también valen.

La exigencia depende de la clase: en **PP** y **PCP** la ruta tiene que existir
en `BD_Maderas`; en **PT** se puede indicar cualquiera que se recomiende, y el
formulario solo avisa si todavía no está.

**Y ninguna ruta puede ser más chica que el producto.** Bajando por el proceso
la madera solo se achica, así que una etapa puede ir sobredimensionada pero
nunca por debajo. En tu propio batch input se ve la escuadría bajando escalón a
escalón: `RVN 033X250` → `RSN 032X240` → producto `032X240X3200`. Una ruta de
`019X100` para un producto de `032X180` se rechaza: de una tabla de 19 mm no
sale una de 32.

Ejemplos, con los mismos códigos de tu archivo:

- `RVMH` → especie `H` y no empieza en `C`: es de Trading, **ninguna** ruta.
- `RVM ` → **R**ústico **V**erde en proceso: solo aserradero; secado y cepillado quedan en blanco.
- `RSFR` → Rústico **S**eco: aserradero y secado.
- `C4JH` → **C**epillado: las tres etapas, aunque lleve `H`.

Qué habilita cada combinación, hoy:

| Centro | TpMt | Agrupaciones |
|---|---|---|
| TCD2 | TTAS | 9 (C4JH, C4KH, RSKH, RSMH, RSNH, RSWH, RSYH, RVBH, RVMH) |
| TCP1 | TTAS | 8 (C4JR, C4KR, RSFR, RSJR, RSKR, RSMR, RSOR, RSZR) |
| TCP1 | TPAS | 16 (las de proceso, de tres letras: CSF, RSF, RVM…) |
| TCD2 | TPAS | ninguna |

## La carga masiva

Primero se pegan **solo los códigos**. Al pulsar *Analizar* aparecen las
columnas de ruta que hagan falta —y nada más: un lote de puro Trading no muestra
ninguna, uno de cepillados muestra las tres—. Desde ahí son cinco columnas de
texto, y **cada línea se lee junto con la misma línea de las demás**:

| Códigos | Aserradero | Secado | Cepillado | PAK |
|---|---|---|---|---|
| `RSJR032X180X3200` | `RVM 032X180` | `RSFD032X180` | | `248` |
| `C4JH019X100X2440` | `RVF 019X100` | `RSF 019X100` | `CSF 019X100` | |

Se pega una columna entera de una vez. Las cinco ruedan juntas, para que las
líneas no dejen de calzar. Una línea en blanco no genera fila, pero **no
renumera**: la fila 5 sigue siendo la línea 5. Si cambias el código de una
línea, su ruta se borra: la de otro producto no le sirve.

Si los códigos vienen de Excel con más columnas pegadas en la misma línea,
también se aprovechan: lo que tenga forma de ruta va a su etapa y un número
suelto es el PAK, sin importar el orden. Lo escrito en la columna de la etapa
manda sobre eso.

Cuando una escuadría tiene **una sola ruta posible** para una etapa, se pone
sola y se escribe de vuelta en su columna. Cuando hay varias, la tabla dice
cuántas hay por elegir. Cada fila dice si está lista o qué le falta, y se revisa
sola mientras escribes.

Con las filas seleccionadas, la barra de abajo ofrece una sola cosa:
**Registrar**. La fila queda en la hoja de su clase y en la bitácora
`Registro`, y sale un aviso con el código y dónde quedó.

Lo ya registrado se marca en la tabla (*Registrada en PT fila 3*) y sale de la
selección: pedir dos veces el mismo código son dos materiales nuevos en SAP.
El marcado dura hasta que pulses *Limpiar*.

El Excel **no se baja desde acá** — está en el menú del spreadsheet, más abajo.

En la carga masiva el PAK es opcional: el batch input crea el maestro de
material, no un pedido. Para exigirlo, `MEDIDAS.EXIGIR_PIEZAS = true`.

## El Excel del batch input

Se baja desde el spreadsheet, no desde la pantalla web:

1. Abre la hoja de la clase (**PT**, **PCP** o **PP**).
2. Selecciona las filas que quieras cargar. Valen las selecciones sueltas con
   `Ctrl` + clic, y seleccionar la hoja entera también sirve: los rótulos de las
   filas 1 y 2 y las filas vacías se descartan solas.
3. **Registro Maderas › Descargar filas seleccionadas como Excel**.

Sale un archivo `batch-input-maderas-pt-20260910-1630.xlsx` con los datos
**desde la fila 3** —la 1 y la 2 en blanco— y las columnas **A hasta AB**, en el
mismo orden que la hoja.

**El archivo lo genera Google, no este código.** Las filas se copian a una hoja
de cálculo temporal y se pide su exportación a Excel: la misma de *Archivo ›
Descargar › Microsoft Excel*. La temporal se borra enseguida, salga bien o mal.
Es un rodeo aparente, pero un xlsx escrito a mano abre en los lectores de
scripting y Excel lo rechaza con *"el formato o la extensión no son válidos"*, y
no hay forma de comprobarlo sin tener Excel delante. Así lo arma el mismo motor
que Excel abre todos los días.

Las filas se copian **tal como están escritas**, sin recalcular nada: lo que ves
en la hoja es exactamente lo que llega al archivo. Por eso `Descripcion Especial
EN/ES` (AA y AB), que el formulario no toca y se escriben a mano, también viajan.

Como casi todo el batch input lleva ceros a la izquierda (`032`, `019X100`,
`21.07.2026`), el formulario deja esas celdas con formato de **texto** al
escribirlas. En formato General, Sheets leería `032` como el número 32 y el
código llegaría mal a SAP.

## Lo que se completa solo

| Dato | Valor |
|---|---|
| País | `CL` |
| Tipo Requerimiento | `NO` |
| Clase Requerimiento | la del paso 1 |
| Llegada requerimiento | la fecha de hoy, como texto `dd.mm.aaaa` |
| Usuario Solicitante | correo de quien está usando el formulario |

## La fila que se escribe

En la hoja de la clase (`PT`, `PCP` o `PP`), desde la fila 3 porque los rótulos
están en la fila 2:

| Col | Rótulo | Qué recibe |
|---|---|---|
| A–F | País … Usuario Solicitante | lo automático de arriba |
| G–J | Aserradero(Template), Tamaño Dimensión, EE, AA | de la ruta: `RVM 032X180` da `RVM`, `032X180`, `032`, `180` |
| K–N | Secado(Template), Tamaño dimensión, EE, AA | igual, con su ruta (vacías si la etapa no aplica) |
| O–R | Cepillado(Template), Tamaño dimensión, EE, AA | igual (vacías si no aplica) |
| S | Empaquetado | la agrupación elegida |
| T–W | Tamaño dimensión, Espesor, Ancho, Largo | la medida final |
| X–Z | PAK, UMB, Stock/Pedido | piezas, unidad y origen |

`EE` y `AA` se calculan igual que los `MID()` de tu hoja Entrada, pero se
escriben como valor: una fila de batch input no debería depender de fórmulas.

`Descripcion Especial EN/ES` y los rendimientos **no se tocan**.

Además, cada solicitud deja una línea en la hoja `Registro`, con `Hoja Destino`
y `Fila Destino` para poder ir de la bitácora a la fila original.

---

## Cómo se instala

Cinco pasos, una sola vez. Son nueve archivos más el manifiesto, los de la
carpeta `fuente/`.

### 1. Abre el editor

En el spreadsheet **Maderas**: **Extensiones › Apps Script**.

### 2. Crea los nueve archivos

Con el **+** de la lista de archivos: *Secuencia de comandos* para los `.gs` y
*HTML* para los `.html`. Al crearlos escribe el nombre sin la extensión (Apps
Script se la pone solo). En cada uno pega el contenido del archivo de esta
carpeta:

| Archivo en Apps Script | Contenido |
|---|---|
| `appsscript.json` | `fuente/appsscript.json` (ver el paso 3) |
| `Config.gs` | `fuente/Config.gs` |
| `Registro.gs` | `fuente/Registro.gs` |
| `Lote.gs` | `fuente/Lote.gs` |
| `Exportar.gs` | `fuente/Exportar.gs` |
| `Setup.gs` | `fuente/Setup.gs` |
| `WebApp.gs` | `fuente/WebApp.gs` |
| `Estilos.html` | `fuente/Estilos.html` |
| `Masivo.html` | `fuente/Masivo.html` |
| `Descarga.html` | `fuente/Descarga.html` |

Borra el `Código.gs` que viene por defecto con su `function myFunction() {}`.
Guarda con `Ctrl+S`.

Los nombres `Estilos`, `Masivo` y `Descarga` tienen que quedar tal cual: el
código los llama por ese nombre. Los `.gs` pueden llamarse como quieras y el orden no
importa, porque en Apps Script todos comparten el mismo espacio.

### 3. Declara los permisos

En el editor, **⚙ Configuración del proyecto** › marca **«Mostrar el archivo de
manifiesto appsscript.json en el editor»**. Aparece `appsscript.json` en la lista
de archivos: reemplaza su contenido por el de `fuente/appsscript.json`.

Ahí van declarados los cinco permisos que el script necesita:

| Permiso | Para qué |
|---|---|
| `spreadsheets` | Leer `BD_Maderas` y escribir en PT, PCP, PP y `Registro` |
| `drive` | Crear la hoja temporal del Excel y mandarla a la papelera |
| `script.external_request` | Pedirle a Google la exportación a Excel |
| `script.container.ui` | El menú y los cuadros de diálogo |
| `userinfo.email` | Saber quién registra cada solicitud |

Sin este archivo Apps Script los adivina leyendo el código, y esa adivinanza
falla justo cuando se agregan permisos nuevos: el menú tira un error de permiso
y no aparece ninguna pantalla para aceptarlos.

### 4. Prepara las hojas

En el selector de funciones elige **`instalarRegistro`** y pulsa **Ejecutar**.

Google pedirá permisos: *Revisar permisos › elige tu cuenta › Configuración
avanzada › Ir a (nombre del proyecto) › Permitir*. La pantalla de "app no
verificada" es normal en scripts propios.

Revisa que estén `BD_Maderas`, `PT`, `PCP` y `PP` con sus columnas donde se
esperan, y deja `Registro` con sus encabezados. **No crea ninguna hoja más.**

Después elige **`revisarPermisos`** y **Ejecutar**. Hace el viaje completo de la
exportación con una fila de mentira y dice dónde se corta, si se corta. Sirve
para saber que el Excel va a salir **antes** de necesitarlo de verdad.

### 5. Publica

**Implementar › Nueva implementación › ⚙ › Aplicación web**

| Campo | Valor |
|---|---|
| *Ejecutar como* | **Yo** |
| *Quién tiene acceso* | **Cualquier usuario de tu dominio** |

⚠️ Tiene que decir **"de tu dominio"**, no "Cualquier usuario" a secas. De ese
segundo modo Google no entrega el correo del visitante y se pierde el registro
de quién pidió qué. Si eso pasa, el formulario **bloquea** el guardado en vez de
anotar una solicitud sin solicitante.

### 6. Reparte el enlace

Copia la URL y mándala. El menú **Registro Maderas › Ver enlace del formulario**
también la muestra.

El menú aparece al abrir el spreadsheet. Si no está, recarga la pestaña: `onOpen`
corre en cada apertura.

---

## Decisiones que conviene revisar

**Las hojas de ruta salen de la base, no de un catálogo.** Para `032X180` la base
tiene `RVFD032X180` (aserradero) y `RSFD032X180` (secado), que son justo las que
usaba tu fila de ejemplo. Si una etapa tiene una sola ruta posible, se pone sola;
si hay varias, se elige.

**Trading exige especie `H`.** Con ese origen la lista de agrupaciones se filtra a
las que terminan en `H`, y al guardar se vuelve a comprobar. En la práctica eso
deja Trading en TCD2, que es donde están todas las de terceros. Se cambia en
`TRADING.ESPECIE` (`Config.gs`).

**Dónde se afloja cada regla.** `MEDIDAS.EXIGIR_NUEVO = false` deja registrar un
código que ya exista; `RUTAS.DEBE_EXISTIR_EN` decide en qué clases la ruta tiene
que estar en la base; `RUTAS.OBLIGATORIA = false` permite dejar una etapa sin
ruta.

**Los códigos con espacios raros igual se encuentran.** Hay 15 filas en
`BD_Maderas` con un espacio duro pegado al final (`RSFR037X130X3600 `). El
formulario los reconoce y guarda el código limpio.

**El solicitante es el correo, no el nombre.** En tu ejemplo decía
"Babara Riquelme"; acá queda `barbara.riquelme@…` porque es lo que Google
entrega de forma confiable y no se puede escribir a mano.

**La fecha va como texto.** `21.07.2026`, no como fecha de Sheets, para que el
batch input salga tal cual.

**El aviso de "registrado" está hecho a mano.** Podría ser SweetAlert desde un
CDN, pero es la única señal de que la solicitud quedó guardada, y si el proxy de
la empresa bloquea el CDN el usuario se queda sin saber. Está armado con los
mismos colores del resto, en `Estilos.html`.

**La descarga del menú pide un clic.** El diálogo no baja el archivo solo: el
iframe de los diálogos de Apps Script no siempre lo permite, y un archivo que a
veces sale y a veces no es peor que uno que siempre pide un clic.

**El archivo no viaja en el `href`.** La impresión de plantilla escapa según el
contexto, y en un `href` eso incluye sanear la URL: un `data:` con un xlsx
adentro es justo lo que esa defensa bloquea, y el enlace queda apuntando a nada
mientras el nombre del archivo sigue saliendo bien. El base64 va en un atributo
común, el navegador arma un Blob y de ahí sale el enlace; el diálogo compara los
bytes que recibió con los que dijo el servidor antes de ofrecerlos.

**La exportación pide permiso de Drive.** Crear y borrar la hoja temporal, y
pedirle a Google el xlsx, necesitan permisos que la primera versión no pedía. Van
declarados en `appsscript.json`; si tu administrador prefiere algo más estrecho,
`drive` se puede cambiar por `drive.file`, que solo alcanza a los archivos que
crea el propio script. Es lo justo para la hoja temporal, pero conviene probarlo
con **Revisar permisos** antes de darlo por bueno.

**Cuando cambian los permisos hay que volver a autorizar, y a publicar.** El
menú toma los permisos nuevos apenas se acepta la pantalla de autorización,
pero **la aplicación web se queda con los de la implementación que está
publicada**: hay que crear una implementación nueva para que los tome.

## Quién puede entrar

Por defecto entra cualquiera con el enlace (dentro del dominio). Para limitarlo,
pon los correos en `ACCESOS` (`Config.gs`):

```js
const ACCESOS = ['ana@empresa.com', 'beto@empresa.com'];
```

El permiso se revisa **también al guardar**, no solo al abrir la página.

---

## Para desarrollar (opcional)

Los archivos de `fuente/` son exactamente los que van al editor: acá no se
genera ni se compila nada. Si editas en el editor de Apps Script, copia el
cambio de vuelta para que el repositorio siga siendo el respaldo.

| Archivo | Qué hay |
|---|---|
| `fuente/Config.gs` | Clases, orígenes, centros, nomenclatura, mapeo de columnas, `ACCESOS`. |
| `fuente/Registro.gs` | Armado y desarmado del código, etapas aplicables, búsqueda y escritura. |
| `fuente/Lote.gs` | La carga masiva: deducción, análisis del pegado y guardado en bloque. |
| `fuente/Exportar.gs` | El Excel desde el menú: hoja temporal, exportación de Google y a la papelera. |
| `fuente/Setup.gs` | Revisa las hojas y sus columnas. Menú. |
| `fuente/WebApp.gs` | Entrega el formulario. |
| `fuente/Estilos.html` | El sistema visual. |
| `fuente/Masivo.html` | Las cinco columnas, la tabla del lote y la barra de acciones. |
| `fuente/Descarga.html` | El diálogo del menú, con el botón para bajar el archivo. |
| `pruebas/` | Simulador de Apps Script + pruebas. |

```bash
cd registromaderas/pruebas && node test.js
```

Las pruebas levantan las hojas con los mismos encabezados que tiene hoy el
spreadsheet (rótulos repetidos incluidos) y cubren las condicionales: qué
agrupación habilita cada centro, qué etapas aplican según el prefijo, cómo se
arma y se desarma el código, que el producto sea nuevo y las rutas existan, qué
queda escrito en cada columna, y que pegar el código y armarlo a mano produzcan
exactamente la misma fila.
