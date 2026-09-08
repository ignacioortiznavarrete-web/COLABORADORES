# pedidos-sap — ME31K / ME21N / ME22N desde Excel

Macro de Excel (VBA + SAP GUI Scripting) para el trabajo mensual de pedidos.

Lo que antes se hacía a mano en ME22N —entrar a *Datos adicionales* y poner la
fecha, levantar la barra de abajo, escribir `99,9` y la calidad posición por
posición— ahora lo hace la macro sola, pedido por pedido.

---

## Dos archivos, uno por mes

| Archivo | Macro (`Alt+F8`) | Período que usa |
|---|---|---|
| **`PedidosMesActual.bas`** | `PEDIDOS_MES_ACTUAL` | día 01 del mes en curso → último día de ese mes |
| **`PedidosMesSiguiente.bas`** | `PEDIDOS_MES_SIGUIENTE` | día 01 del mes que viene → último día de ese mes |

Son el mismo código; lo único que cambia es el mes. Puedes importar **uno solo
o los dos**: cada uno es un módulo independiente y no chocan entre sí, porque
todo lo de adentro es privado salvo su macro.

El último día lo calcula solo (28, 29, 30 o 31). Ejecutando en septiembre de
2026, `PEDIDOS_MES_ACTUAL` trabaja con **01.09.2026 – 30.09.2026** y
`PEDIDOS_MES_SIGUIENTE` con **01.10.2026 – 31.10.2026**. No hay que tocar
ninguna fecha en el código, ningún mes.

Las dos preguntan lo mismo al arrancar, y muestran el período antes de empezar:

```
1 = Crear PEDIDOS ABIERTOS (ME31K)
2 = Crear PEDIDOS de compra (ME21N)
3 = ACTUALIZAR pedidos ya creados (ME22N)   <- lo que se hacía a mano
4 = ME31K y después ME21N
```

---

## Qué hace la opción 3 (ME22N)

Para cada bloque de la planilla que tenga número de pedido en la columna J:

1. Abre `ME22N` y pide **ese** pedido con *Otro documento*. Comprueba en el
   título que abrió el pedido correcto; si no, lo anota y pasa al siguiente
   (nunca modifica un pedido que no era).
2. **Cabecera › Datos adicionales**: escribe la validez, del 01 al último día
   del mes elegido, y verifica que quedó escrita.
3. **Síntesis de posiciones**: recorre todas las líneas, con scroll incluido, y
   pone la **fecha de entrega** en cada una.
4. **Detalle de posición** (la barra de abajo): la abre solo si está cerrada
   —así no la cierra sin querer— y en **cada** posición escribe la
   **tolerancia de exceso 99,9** y el **texto de posición** con la calidad de
   la columna I. Después de escribir vuelve a leer el campo: si no quedó, lo
   reintenta.
5. Graba y deja una línea en la hoja **Registro** con lo que pasó.

---

## Instalación (una sola vez)

1. `Alt+F11` → **Archivo › Importar archivo…** → elige `PedidosMesActual.bas`.
2. Repite con `PedidosMesSiguiente.bas` si quieres tener los dos meses.
   (O bien **Insertar › Módulo** y pega el texto completo del archivo.)
3. Borra el módulo viejo, para que no queden macros repetidas.
4. Guarda el libro como **`.xlsm`**.

Quedan dos módulos, `PedidosMesActual` y `PedidosMesSiguiente`, y en `Alt+F8`
aparecen solo sus dos macros.

En SAP tiene que estar habilitado el scripting (`sapgui/user_scripting = TRUE`
en el servidor y *Opciones › Accesibilidad y scripting › Scripting* en el
GUI, sin las casillas de aviso).

---

## La planilla (Hoja1)

Un bloque por proveedor. La fila que dice `Material` abre cada bloque y los
datos de cabecera se leen de la **primera fila** del bloque:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| Material | Precio | Cantidad | UMP | Proveedor | Valor total | Moneda | Pedido Abierto | Calidad | Numero de oc |

- **H (Pedido Abierto)**: la escribe ME31K y la lee ME21N.
- **J (Numero de oc)**: la escribe ME21N y la lee **ME22N**.
- **I (Calidad)**: es el texto de posición. Si quieres que en SAP diga
  `CALIDAD 2` en vez de `2`, pon `PREFIJO_CALIDAD = "CALIDAD "` arriba del
  módulo.

Los bloques sin número en la columna que corresponde no se procesan: quedan
como `OMITIDO` en el registro.

---

## La hoja Registro

Se crea sola la primera vez. Una línea por bloque:

| Fecha y hora | Fila | Documento | Proveedor | Resultado | Detalle | Período |
|---|---|---|---|---|---|---|

`Resultado` es `OK`, `REVISAR`, `ERROR` u `OMITIDO`, y `Detalle` dice
exactamente qué se escribió, por ejemplo:

```
validez 01.10.2026 a 31.10.2026 | entrega 31.10.2026 en 17/17 posiciones |
99,9 en 17/17 posiciones, calidad 2 en 17/17
```

Con 67 bloques es la forma rápida de ver qué quedó a medias sin revisar pedido
por pedido en SAP.

---

## Ajustes (arriba de cada módulo)

```vba
Const TOL_EXCESO        As String = "99,9"       ' sobreentrega EKPO-UEBTO
Const PREFIJO_CALIDAD   As String = ""           ' "CALIDAD " si quieres texto largo
Const ENTREGA_AL_CIERRE As Boolean = True        ' True = entrega el último día
                                                 ' False = entrega el día 01
Const GUARDAR_AUTO      As Boolean = True        ' False = revisas y grabas tú
Const FORMATO_FECHA     As String = "DD.MM.YYYY" ' formato de fecha de tu usuario SAP
Const SEP_DECIMAL       As String = ","          ' separador decimal de tu usuario SAP
Const HOJA_LOG          As String = "Registro"   ' "" = no dejar registro
```

`FORMATO_FECHA` y `SEP_DECIMAL` tienen que coincidir con lo que tiene tu
usuario en `SU3 › Valores fijos`. Si ahí la fecha es `MM/DD/YYYY`, cámbialo o
SAP rechazará todas las fechas.

### Qué se escribe en cada transacción

Los campos y los ID salen de una **grabación de una ME31K real** (Alt+F12 ›
Grabar script), no de suposiciones:

**Pantalla inicial** — `EKKO-LIFNR`, `RM06E-EVART`, `RM06E-VEDAT` (fecha de
contrato), `EKKO-EKORG`, `EKKO-EKGRP`, y `RM06E-WERKS` / `RM06E-LGORT` /
`RM06E-MATKL`. La validez y el valor previsto **no** van aquí.

**Pantalla de cabecera** — `EKKO-KDATB`, `EKKO-KDATE` y `txtEKKO-KTWRT`, este
último con dos decimales (`179213,00`).

**Tabla de posiciones** — `tblSAPMM06ETC_0220`, columnas `EKPO-EMATN`,
`EKPO-KTMNG` y `EKPO-NETPR`. La unidad no se escribe: la trae SAP del material
(`ME31K_ESCRIBIR_UMP = False`).

Cada escritura se comprueba releyendo el campo, y las cinco casillas que se
tildaban a ciegas siguen apagadas.

```vba
' Pantalla inicial de ME31K
Const ME31K_DATOS_POSICION  As Boolean = True    ' centro / almacén / grupo de artículos
Const ME31K_MARCAR_CASILLAS As Boolean = False   ' antes se tildaban 5 casillas a ciegas

' Columnas de la grilla de ME21N
Const ME21N_MATERIAL As Boolean = True
Const ME21N_CANTIDAD As Boolean = True
Const ME21N_UMP      As Boolean = True
Const ME21N_PRECIO   As Boolean = True
Const ME21N_MONEDA   As Boolean = False   ' la moneda es de cabecera, no de posición
Const ME21N_ENTREGA  As Boolean = True
```

En ME21N el contrato marco (`KONNR` + `KTPNR`) se escribe **primero**, para que
SAP traiga del contrato lo que corresponda antes de que la macro escriba el
resto. Si en tu R3 el precio o la unidad tienen que venir del contrato y no de
la planilla, pon esas constantes en `False`.

Las casillas de la pantalla inicial de ME31K ya no se tildan: eran cinco
(`XOBLR`, `XOBL`, `XOBLK`…) y se marcaban sin mirar si existían o qué hacían. Si
en tu R3 hiciera falta alguna, se vuelven a activar con
`ME31K_MARCAR_CASILLAS = True`.

---

## Si algo falla: el diagnóstico

Cuando ME31K no llega a las posiciones, el aviso trae **dónde se quedó
exactamente y qué le falta**:

```
Donde quedo SAP:
  transaccion ME31K, programa SAPMM06E, dynpro 201
  ventana: Crear Pedido abierto : Datos cabecera
  mensaje (E): Complete todos los campos obligatorios
  obligatorios vacios: EKKO-ZTERM (Cond.pago) | EKKO-INCO1 (Incoterms)
  tablas en pantalla: (ninguna)
```

La línea **`obligatorios vacios`** recorre la pantalla y lista los campos que
SAP marca como obligatorios y están sin llenar, con su nombre técnico y su
etiqueta. Eso es lo que hay que completar.

### Avisos que piden un segundo Enter

Cuando el contrato empieza el **día 01 del mes en curso**, esa fecha ya está en
el pasado y SAP saca un aviso: la pantalla no avanza hasta que se acepta con
otro Enter. La macro lo detecta —mira si el dynpro cambió y si SAP dejó mensaje— y manda el
Enter que falta, hasta tres veces. Solo repite si sigue en la misma pantalla,
para no saltarse ninguna. Es el doble Enter que aparece en la grabación después
de la pantalla inicial y otra vez después de la cabecera.

Lo importante es **cuándo**: el aviso se acepta **antes** de escribir la
validez, no después. Si queda pendiente en la barra, el primer Enter que se
mande se lo come el aviso — y con él se pierde lo recién escrito, que es por lo
que SAP volvía a pedir el fin de período de validez una y otra vez. Es el mismo
orden de la grabación: Enter, Enter, y recién ahí las fechas y el valor.

Cada aviso aceptado queda anotado: `aviso aceptado con otro Enter: …` o
`aviso pendiente aceptado antes de escribir: …`.

Al archivo del mes siguiente casi no le pasa, porque su fecha de inicio es
futura; al del mes actual le pasa siempre a partir del día 2.

### Campos que tu R3 pide de más

Se agregan sin tocar código, en dos constantes:

```vba
Const ME31K_INICIAL_EXTRA   As String = ""
Const ME31K_CABECERA_EXTRA  As String = "EKKO-ZTERM=0001;EKKO-INCO1=CIF"
```

Formato `CAMPO=VALOR`, separados por `;`, con el nombre técnico tal como sale
en el diagnóstico. Se escriben en su pantalla justo antes del Enter.

Mientras no estén configurados, con `ME31K_PEDIR_AYUDA = True` (por defecto) la
macro **no abandona el bloque**: te muestra qué falta, esperas a completarlo a
mano en SAP, pulsas Aceptar y sigue sola. Cuando ya sepas cuáles son y los
pongas en la constante, deja de preguntar.

### Cómo se rellena la cabecera del contrato

En la pantalla **Datos cabecera** de ME31K (dynpro 201), SAP pide como
obligatorios `EKKO-KDATE` (Fin per.validez) y `EKKO-KTWRT` (Val.prev.). La
macro los toma de:

| Campo SAP | De dónde sale |
|---|---|
| `EKKO-KDATB` (Inicio validez) | día 01 del mes elegido |
| `EKKO-KDATE` (Fin per.validez) | último día de ese mes |
| `EKKO-KTWRT` (Val.prev.) | **columna F, Valor total** de la planilla |
| `EKKO-WAERS` (Moneda) | columna G |

Cada escritura se **verifica**: se escribe y se vuelve a leer el campo. Si
quedó vacío o el campo no era modificable, la macro sigue buscando por otra
ruta y por nombre en toda la pantalla, en vez de darlo por bueno.

Después hace un **barrido**: recorre la pantalla, y cualquier campo que SAP
marque como obligatorio y siga vacío lo rellena si sabe qué va ahí (los cuatro
de la tabla, más los que estén en `ME31K_CABECERA_EXTRA`).

Antes de escribir se pone el **foco** en el campo: sin eso SAP rechaza la
entrada en campos que están dentro de una subpantalla o fuera de la vista.

Si aun así falta algo, el aviso muestra qué intentó escribir la macro campo por
campo, y **cada línea dice qué pasó**:

| Línea del aviso | Qué significa |
|---|---|
| `EKKO-KTWRT = 111142,4` | entró bien |
| `EKKO-KDATE rechazado por SAP: …` | SAP no aceptó el valor (formato de fecha o separador decimal) |
| `EKKO-KDATE no se puede modificar` | el campo está en pantalla pero bloqueado |
| `EKKO-KDATE quedó vacío al escribir …` | se escribió y SAP lo borró |
| `EKKO-KDATE no aparece en esta pantalla` | el campo no está donde la macro mira |

Si sale **rechazado por SAP** en una fecha, revisa `FORMATO_FECHA`; si sale en
`EKKO-KTWRT`, revisa `SEP_DECIMAL`. Los dos tienen que coincidir con lo que
tiene tu usuario en `SU3 › Valores fijos`.

El mismo detalle queda en la hoja **Registro**, última fila, columna `Detalle`,
donde se puede copiar entero sin que lo corte la ventana.

### Campos dentro de subpantallas

Los campos se buscan primero por su ruta (`wnd[0]/usr/ctxtEKKO-KDATB`) y, si no
están ahí, **por su nombre en toda la pantalla**. Así funciona aunque en tu
sistema vivan dentro de una subpantalla (`wnd[0]/usr/subSUB…:SAPMM06E:0201/…`),
que es la causa más habitual de que "se escriba" un dato y SAP siga pidiéndolo.

La tabla de posiciones tampoco se busca ya por cuatro nombres fijos: se recorre
la pantalla y se toma la que tenga columna de material.

Además, entre pantalla y pantalla mira la barra de estado: si SAP contesta con
un error (`E`) o un aborto (`A`), se detiene ahí y lo anota, en vez de seguir
mandando Enter a ciegas.

La primera vez conviene correrlo con `GUARDAR_AUTO = False` y un par de
bloques, para mirar en pantalla antes de grabar.

Los dos archivos llevan los mismos ajustes: si cambias uno (por ejemplo la
tolerancia o el prefijo de calidad), cámbialo también en el otro.

---

## Cosas de R/3 que conviene saber

- **Tolerancia gris.** Si la posición tiene marcado *Entrega excedente
  ilimitada* (`EKPO-UEBTK`), el campo de sobreentrega queda deshabilitado y no
  se puede escribir `99,9`. El registro lo va a mostrar como `99,9 en 0/17`.
  Hay que destildar esa marca (o hacerlo desde el registro info / la
  clase de pedido).
- **Fecha de entrega con entrada de mercancía.** Si la posición ya tiene
  entradas, SAP avisa al cambiar la fecha. La macro confirma el aviso y deja
  el mensaje en el registro; conviene revisar esos casos.
- **Repartos múltiples.** La macro cambia la fecha en la síntesis de
  posiciones, que sirve cuando la posición tiene un solo reparto. Si alguna
  tiene varios, hay que tocarla en la pestaña *Reparto*.
- **Validez en la cabecera del pedido.** Son `EKKO-KDATB` / `EKKO-KDATE`, en
  *Datos adicionales*. La macro busca sola en qué pestaña están, porque el
  número (`TABHDT7` y compañía) cambia de un sistema a otro.
- **Alternativa estándar.** Para cambios masivos de fecha de entrega y
  tolerancias sobre muchos pedidos existe **`MEMASSPO`** (modificación masiva
  de pedidos), que trabaja por lote y sin GUI scripting. Es más rápido si
  algún mes hay que corregir solo un campo en muchos pedidos; esta macro sigue
  siendo la que sirve cuando además hay que escribir el **texto de posición**,
  que MEMASSPO no toca.
- La macro **nunca** usa `F3` para salir: siempre `/n`, así no aparece el
  popup de "¿grabar datos?" con un pedido a medio modificar.

---

## Rutina de cada mes

1. Actualiza la planilla con los materiales, precios y cantidades del mes.
2. `PEDIDOS_MES_SIGUIENTE` → opción **1** (ME31K). Quedan los pedidos abiertos
   en la columna H.
3. `PEDIDOS_MES_SIGUIENTE` → opción **2** (ME21N). Quedan los números de pedido
   en la columna J.
4. Si después hay que corregir fechas, tolerancia o calidad:
   `PEDIDOS_MES_SIGUIENTE` → opción **3** (ME22N).
5. Mira la hoja **Registro** y revisa en SAP solo lo que salió `REVISAR` o
   `ERROR`.

Para arreglar algo del mes que ya está corriendo, lo mismo pero con
`PEDIDOS_MES_ACTUAL`.
