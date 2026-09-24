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
y largo (4). Con largo el código mide **16 caracteres**; sin largo, **11**.

**Los ceros a la izquierda los pone el formulario.** Se pega el código como se
tenga a mano y sale completo:

| Se pega | Queda |
|---|---|
| `RVMH32X180X3960` | `RVMH032X180X3960` |
| `RVMH32X18X396` | `RVMH032X018X0396` |
| `RVM32X180` | `RVM 032X180` |
| `RVF 19X100` (una ruta) | `RVF 019X100` |

Los ceros no son cosmética: viajan a cada columna del batch input. De
`RSFR37X130X3200` con la ruta `RVF 37X130` sale `037X130` en *Tamaño
Dimensión*, `037` en *EE*, `130` en *AA*, `037X130X3200` en la medida final y
`037`, `130`, `3200` en espesor, ancho y largo.

Y una ruta escrita corta encuentra igual su material en la base: se busca
`RVF 019X100`, no `RVF 19X100`.

Para desambiguar `RVM32X180` —que sin más podría leerse como prefijo `RVM3` y
espesor `002`— se usa la nomenclatura: el 4º carácter del prefijo es la especie,
y una especie nunca es un dígito.

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

**Primero se elige el tipo: PT, PP o PE.** Toda la tanda va de ese tipo, y no es
un rótulo: de él dependen las hojas de ruta que se abren. Mezclar terminados con
material de proceso pediría rutas distintas línea por línea, así que un código
que no sea del tipo elegido se rechaza y dice por qué.

| Tipo | Qué es | Forma del código | Unidad | Escribe en |
|---|---|---|---|---|
| **PT** | Producto Terminado | con largo (16 caracteres) | PZA | `PT` |
| **PP** | Producto de Proceso | sin largo (11) | m3 | `PP` / `PCP` |
| **PE** | PE Terminado (m3) | no se revisa | m3 | `PT` |

En **PP**, el que empieza con `C` es cepillado y va a la hoja `PCP`; el resto a
`PP`.

**PE es terminado**, y eso decide dos cosas. Su fila del batch input va a la
hoja `PT`, con los demás terminados. Y abre la cadena completa, como un PT:

| Empieza con | Abre |
|---|---|
| `RV` | aserradero |
| `RS` | aserradero y secado |
| `C` | las tres |

Eso es justo lo que lo distingue de uno de proceso: `RSF 037X130` como **PP**
abre solo el aserradero —es una etapa, y pide la de antes—, y como **PE** abre
aserradero y secado, porque es un producto. Lo único que no se le revisa es la
forma del código: es especial porque quien pide lo dice. Y va en m3 aunque
escriba en `PT`.

Los ejemplos que se ven al pegar son **del tipo elegido**: un código con largo
no le sirve de guía a quien pide material de proceso.

Elegido el tipo, se pegan **solo los códigos**. **No hay botón de analizar**:
la tanda se revisa sola mientras escribes. Si cambian los códigos se relee todo
—de ellos salen la clase, las etapas y qué columnas se abren—; si solo cambia
una ruta o un PAK alcanza con revisar, que no relee la base. Al salir de una
caja no se espera: lo pendiente se resuelve ahí mismo, y con la respuesta se
acomodan los ceros y las rutas, que es lo que no se puede escribir mientras el
cursor está dentro. Al pulsar *Analizar* aparecen las
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

**No se eligen líneas: es todo o nada.** La tabla no tiene casillas; se
registra lo que esté listo, y lo que tenga algo pendiente se queda fuera y dice
qué le falta. La barra de abajo ofrece una sola cosa: **Registrar**. La fila queda en la hoja de su clase y en la bitácora
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
| Usuario Solicitante | el nombre de quien usa el formulario |

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

## Las dos bitácoras

Guardar deja tres rastros, cada uno con su oficio:

| Dónde | Cuántas filas | Para qué |
|---|---|---|
| `PT` · `PCP` · `PP` · `PE` | una por código | la fila de batch input que va a SAP |
| **`Registro`** | **una por solicitud** | la cabecera: quién, cuándo, cuántos códigos |
| `Registro Detalle` | una por código | qué código es cada uno, y dónde quedó |

`Registro` no lleva una fila por código sino **una por solicitud**, y solo
estas nueve columnas, en este orden:

| # | Columna | Qué trae |
|---|---|---|
| 1 | `N° Solicitud` | `SOL-00001`, `SOL-00002`… |
| 2 | `Fecha` | cuándo se ingresó, como texto `dd.mm.aaaa` |
| 3 | `Usuario` | el correo de quien la pidió |
| 4 | `Tipo Solicitud` | `PT`, `PP` o `PE` |
| 5 | `Estado` | nace en `Solicitando`, y la celda trae su lista |
| 6 | `Fecha de creación` | **en blanco**: la llena codificación |
| 7 | `SKU` | los códigos de la solicitud, separados por coma |
| 8 | `Observación` | la del solicitante |
| 9 | `Observación codificación` | **en blanco**: la llena codificación |

Las dos columnas en blanco nacen vacías a propósito: son de codificación, y el
formulario no tiene nada que poner ahí todavía.

### El estado se elige de una lista

La columna `Estado` lleva una **lista desplegable en la propia hoja**, con los
cinco estados por los que pasa una solicitud:

**Solicitando** → **Validando información** → **Pendiente** → **Creando** →
**Finalizado**

Nace en `Solicitando`, y de ahí en adelante lo mueve **codificación, en la
hoja**: clic en la celda y se elige. No admite escribir uno que no esté en la
lista, así que no quedan variantes sueltas ni hay que acordarse de cómo se
escribe cada uno.

El combo va ahí y no en el monitor a propósito: el monitor se reparte a quien
deba mirar —quien pidió, quien espera— y ninguno de ellos debería poder cambiar
una solicitud. Ahí el estado solo se ve y se filtra.

La lista se pone al correr `instalarRegistro`, y cada solicitud nueva nace con
la suya.

Todo lo demás —país, tipo de requerimiento, origen, centro, medidas, rutas—
está en **`Registro Detalle`**, que tiene una línea por material y sitio donde
quepa. Lleva el **mismo número de solicitud** en cada línea: filtrando por
él salen exactamente los códigos de esa solicitud, y sus columnas `Hoja Destino`
y `Fila Destino` dicen en qué fila del batch input quedó cada uno.

El número sale de la última fila de `Registro`, no de un contador aparte: si
alguien copia la hoja o borra filas, el número sigue siendo el que se ve. Se
toma dentro del mismo bloqueo con que se escribe, así que dos personas
guardando a la vez no se llevan el mismo.

Si no entra ningún código, **no se anota la solicitud**: no queda una fila vacía
de algo que no ocurrió.

---

## Ver las solicitudes

**Al registrar sale un aviso, y al aceptarlo se pasa al monitor.** Nunca solo:
el aviso dice cuántos entraron y cuántos no, y saltar sin esperar dejaría eso
sin leer.

Cuando todo entra, es corto:

> **2 códigos registrados**
> La solicitud quedó como SOL-00001.

Y cuando algo quedó fuera, lo dice con la cuenta por delante:

> **4 códigos registrados**
> y 2 no fueron ingresados porque ya existían. Por favor comunicarse con
> codificación. La solicitud quedó como SOL-00001.

Abajo se listan cuáles, uno por línea. Cuenta también las líneas que ni se
intentaron guardar: para quien pegó treinta códigos, esas son parte de lo que
pidió.

La dirección está en `MONITOR.URL` (`Config.gs`); si el monitor se vuelve a
publicar, hay que cambiarla ahí.

El **monitor** es un Apps Script aparte, en `monitor/`, que muestra `Registro`
con sus códigos desplegables. **Solo lee**: el estado lo mueve codificación en
la hoja, no se toca desde la pantalla. Tiene su propio README con cómo se
instala y se publica.

## Cómo se instala

Cinco pasos, una sola vez. Son diez archivos más el manifiesto, los de la
carpeta `fuente/`.

### 1. Abre el editor

En el spreadsheet **Maderas**: **Extensiones › Apps Script**.

### 2. Crea los diez archivos

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
| `Avisos.gs` | `fuente/Avisos.gs` |
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

Revisa que estén `BD_Maderas`, `PT`, `PCP`, `PP` y `PE` con sus columnas donde
se esperan, y deja `Registro` y `Registro Detalle` con sus encabezados. **No
crea ninguna hoja más.**

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

**El solicitante se escribe como nombre.** `jose.ortiz@masisa.com` queda como
`Jose Ortiz`: en las bitácoras se lee a una persona y no una dirección. El
correo sigue siendo la identidad para los permisos, y queda guardado aparte en
`Registro Detalle` para poder avisarle.

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

## Los dos correos

Al **ingresar** una solicitud sale uno a **codificación corporativa**, con el
número, quién pidió, cuántos códigos y cuáles.

Al ponerla en **Finalizado** sale otro a **quien la pidió**: *Código registrado
· costo plan liberado*, con sus códigos y qué se dio de alta en la base.

La dirección de codificación está en `CORREOS.CODIFICACION` (`Config.gs`). La
de quien pidió sale de `Registro Detalle`. **Una dirección vacía es «no
mandar»**: el formulario no falla por eso, solo no avisa, así que se puede
instalar antes de tener la casilla definitiva.

Ningún correo puede tumbar un registro: la solicitud ya quedó escrita cuando el
aviso se intenta, y si algo falla solo deja una línea en el registro de
ejecución.

### De quién sale cada correo

Apps Script **siempre manda desde la cuenta con la que corre el script**. No
hay forma de poner otro remitente. Por eso los dos correos salen de cuentas
distintas aunque vivan en el mismo proyecto:

| Correo | Lo dispara | Sale de | Responder le escribe a |
|---|---|---|---|
| Ingreso | el formulario web | la cuenta que **publicó** el formulario | quien pidió |
| Finalizado | el disparador de edición | la cuenta que **instaló** el disparador | codificación |

Eso es lo que resuelve el asunto sin necesidad de un Apps Script aparte: **si
codificación instala el disparador desde su cuenta, el aviso de finalizado sale
de codificación**. Por eso el menú avisa con qué cuenta lo estás instalando.

El de ingreso no puede salir de cada solicitante mientras el formulario esté
publicado como *Ejecutar como: Yo*, así que lleva **`replyTo`** con su dirección
y su nombre en el remitente: *Solicitud Código Maderas ·
jose.ortiz@masisa.com*. Si hace falta que salga de verdad desde su cuenta, hay
que publicarlo como *Ejecutar como: el usuario que accede*, y entonces cada
persona tiene que autorizar el script y tener permiso de edición sobre el
spreadsheet.

### Al finalizar, los materiales entran a BD_Maderas

Poner **Finalizado** en la columna `Estado` de `Registro` da de alta en
`BD_Maderas` los códigos de esa solicitud **y las hojas de ruta que
nombraron**. Lo que ya está **no se vuelve a agregar** —la base no debería
tener un material dos veces—, y cerrar la misma solicitud otra vez no agrega
nada.

Para que corra hay que activarlo una vez: **Registro Maderas › Activar el
cierre al finalizar**. Instala un disparador con permisos; el `onEdit` simple
no sirve, porque corre sin ellos y no podría escribir en la base ni mandar
correos.

**Quien lo instale es de quien saldrá el correo de finalizado**, así que
debería instalarlo codificación. Si el correo falla, los materiales entran a la
base igual.

## Quién puede entrar

Hoy entra **una sola cuenta**, la que está en `ACCESOS` (`Config.gs`):

```js
const ACCESOS = ['jose.ortiz@masisa.com'];
```

Para abrirlo a más, se agregan a esa lista. Dejarla **vacía** abre el
formulario a cualquiera del dominio que tenga el enlace.

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
| `fuente/Avisos.gs` | Los correos, y lo que pasa al poner Finalizado. |
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
