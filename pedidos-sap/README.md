# pedidos-sap — ME31K / ME21N / ME22N desde Excel

Macro de Excel (VBA + SAP GUI Scripting) para el trabajo mensual de pedidos.
Un solo archivo: **`PedidosSAP.bas`**.

Lo que antes se hacía a mano en ME22N —entrar a *Datos adicionales* y poner la
fecha, levantar la barra de abajo, escribir `99,9` y la calidad posición por
posición— ahora lo hace la macro sola, pedido por pedido.

---

## Las dos macros

`Alt+F8` y aparecen solo dos nombres:

| Macro | Período que usa |
|---|---|
| **`MES_ACTUAL`** | día 01 del mes en curso → último día de ese mes |
| **`MES_SIGUIENTE`** | día 01 del mes que viene → último día de ese mes |

El último día lo calcula solo (28, 29, 30 o 31). Ejecutando en septiembre de
2026, `MES_ACTUAL` trabaja con **01.09.2026 – 30.09.2026** y `MES_SIGUIENTE`
con **01.10.2026 – 31.10.2026**. No hay que tocar nada en el código cada mes.

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

1. `Alt+F11` → **Archivo › Importar archivo…** → elige `PedidosSAP.bas`.
   (O bien **Insertar › Módulo** y pega el texto completo del archivo.)
2. Borra el módulo viejo, para que no queden dos macros con el mismo nombre.
3. Guarda el libro como **`.xlsm`**.

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

## Ajustes (arriba del módulo)

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

La primera vez conviene correrlo con `GUARDAR_AUTO = False` y un par de
bloques, para mirar en pantalla antes de grabar.

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
2. `MES_SIGUIENTE` → opción **1** (ME31K). Quedan los pedidos abiertos en la
   columna H.
3. `MES_SIGUIENTE` → opción **2** (ME21N). Quedan los números de pedido en la
   columna J.
4. Si después hay que corregir fechas, tolerancia o calidad:
   `MES_SIGUIENTE` → opción **3** (ME22N).
5. Mira la hoja **Registro** y revisa en SAP solo lo que salió `REVISAR` o
   `ERROR`.
