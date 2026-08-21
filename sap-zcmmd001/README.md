# ZCMMD001 – Carga masiva de recepciones desde Excel

Macro de Excel que registra las recepciones de trozos en la transacción **ZCMMD001**
de R3, leyendo las guías desde la misma planilla. Por cada guía carga la cabecera,
marca la opción del check list, llena la grilla de diámetros, **pregunta si estás
seguro de grabar**, graba, captura el número de documento (`5000XXXXXX`), lo escribe
en la columna `Doc.` y salta a la guía siguiente.

## Qué trae `ZCMMD001.bas`

Un módulo con dos macros:

| Macro | Para qué sirve |
|---|---|
| `CargarRecepcionesZCMMD001` | La carga. Es la que se usa día a día. |
| `DiagnosticoZCMMD001` | Utilitario. Vuelca a un TXT todos los IDs de la pantalla que tengas abierta en SAP (las 3 opciones del check list, los botones, las columnas de la grilla). Se usa una vez, para completar la configuración. |

> El código está escrito **sin tildes a propósito**, para que se vea igual sin importar
> la configuración regional del equipo. Los acentos de los datos del Excel sí se respetan.

## Instalación (una sola vez)

1. Abre tu planilla de recepciones y guárdala como **Libro de Excel habilitado para
   macros (`.xlsm`)** — *Archivo → Guardar como → tipo `.xlsm`*. Un `.xlsx` no guarda
   macros, y si no la macro no puede escribir los números de documento en el archivo.
2. `Alt + F11` para abrir el editor de VBA.
3. *Archivo → Importar archivo…* → elige `ZCMMD001.bas`.
4. Cierra el editor y guarda.

Al abrir el archivo, Excel va a pedir **Habilitar contenido**.

### Botón para no usar `Alt + F8` (opcional)

*Desarrollador → Insertar → Botón (control de formulario)* → dibújalo en la hoja →
asignarle la macro `CargarRecepcionesZCMMD001`. Si no ves la pestaña Desarrollador:
*Archivo → Opciones → Personalizar cinta → marca "Desarrollador"*.

## Cómo se usa

1. Deja **SAP abierto** y con sesión iniciada (en cualquier pantalla: la macro entra
   sola a ZCMMD001 con `/n`).
2. `Alt + F8` → `CargarRecepcionesZCMMD001` → Ejecutar (o el botón).
3. Confirma el ambiente: muestra **sistema, mandante y usuario** para que verifiques
   que estás en productivo y no en otro lado.
4. Elige el modo:
   - **Modo de prueba**: llena toda la pantalla pero **no graba**. Úsalo la primera vez.
   - **Grabación real**, y dentro de eso: *preguntar en cada guía* (recomendado) o
     *grabar todas seguidas*.
5. En cada guía aparece el resumen (guía, OC, fecha, patente, rol, opción, líneas, trozos):
   - **SÍ** = graba y pasa a la siguiente
   - **NO** = omite esa guía (queda marcada `OMITIDA` y se puede reintentar después)
   - **CANCELAR** = detiene todo

Al terminar muestra el resumen y deja una bitácora `ZCMMD001_log_AAAAMMDD_HHMMSS.txt`
en la misma carpeta del archivo, con cada paso, cada mensaje de SAP y el texto de cada
ventana emergente.

### Qué hoja usa

La busca sola: es la que tenga una fila de títulos con `Guia` y `Diametro`. Primero
mira en el libro que tiene la macro, después en los otros libros abiertos, y si no
encuentra ninguna te pide el archivo. Antes de empezar te muestra cuál eligió para que
confirmes.

### Se puede volver a correr sin duplicar

Las guías que ya tienen un número en `Doc.` se saltan automáticamente. Las que quedaron
con `ERROR…`, `OMITIDA` o `REVISAR…` se reintentan. Si se corta a mitad de camino, basta
con volver a ejecutar la macro sobre el mismo archivo.

## Requisitos

1. SAP GUI abierto y con sesión iniciada en el sistema donde vas a cargar.
2. Scripting habilitado en el cliente:
   *SAP Logon → Opciones → Accesibilidad y scripting → Scripting → **Habilitar scripting***
   (conviene desmarcar las dos casillas de notificación, si no aparece un aviso por cada paso).
3. Scripting habilitado en el servidor (`sapgui/user_scripting = TRUE`). Si no lo está, lo activa Basis.

## Formato del Excel

El orden de las columnas no importa, se buscan por el título:

| Columna | Contenido | Va a |
|---|---|---|
| `Tipo.MP` | Tipo de recepción (ej. `2`) | `txtTIPO_RECEP` |
| `Guia` | N° de guía de despacho | `txtXGUIA` |
| `OC` | Orden de compra | `ctxtEKKO-EBELN` |
| `Fecha` | Fecha (`14.08.2026`, `14-08-2026` o fecha de Excel) | `ctxt*EKPO-AEDAT` |
| `Patente` | Patente del camión | `txtXPATEN` |
| `Rol` | Rol del predio | `txt*ZTMMMD001-ROL_PRE` |
| `Cal.Trz` | Calidad del trozo | columna `CALIDAD` de la grilla |
| `Calidad` | Categoría (normalmente vacía) | columna `CATEGORIA` de la grilla |
| `Largo` | Largo (`4`, `3.2`, `4,5`) | columna `LARGO` — se envía como `4,00` / `3,20` / `4,50` |
| `Diametro` | Diámetro | columna `DIAMETRO` |
| `Cantidad` | N° de trozos | columna `TROZO` |
| `Doc.` | **La escribe la macro**: el N° de recepción o el error | — |
| `Tipo Material` | Define cuál de las 3 opciones del check list se marca | radio button |

### Cómo se separan las guías

- La fila que trae **Guía** abre una guía nueva (y su primer diámetro).
- Las filas siguientes **sin Guía** son más diámetros de la misma guía.
- Una **línea completamente en blanco** cierra la guía.

```
Tipo.MP  Guia  OC          Fecha       Patente  Rol      Cal.Trz Calidad Largo Diametro Cantidad
2        726   4800085759  14.08.2026  ZR-7321  204-23   2               4     16       1
                                                         2               4     18       12
                                                         2               4     20       20
         <-- línea en blanco: termina la guía 726 -->
2        727   4800085759  14.08.2026  ZR-7321  204-2344 2               4     18       16
                                                         2               4     20       18
```

## Las 3 opciones del check list

La grabación original marcaba siempre `radMCON` (la 3ª opción). Ahora la opción sale de la
columna **`Tipo Material`**:

- Vacío → opción por defecto (la 3ª, `OPCION_DEFECTO` en la configuración).
- `1`, `2` o `3` → esa opción.
- Un texto (`ASERRABLE`, `PULPABLE`, `DEBOBINABLE`, …) → según la tabla `CargarMapeoTipoMaterial`.
- Un texto que **no** esté en la tabla → esa guía se marca con error y **no se graba**
  (a propósito: es preferible que se detenga a que marque la opción equivocada en productivo).

Para agregar valores, edita arriba del módulo:

```vb
Private Sub CargarMapeoTipoMaterial()
   ...
   AgregarMapeo "ASERRABLE", 1
   AgregarMapeo "PULPABLE",  2
   AgregarMapeo "TU TEXTO",  3     ' <- agrega los que uses
End Sub
```

### Completar los IDs de las opciones 1 y 2

De la grabación solo se conoce el ID de la 3ª opción (`radMCON`). Mientras las otras dos
estén en blanco, la macro las selecciona **por posición** leyendo la pantalla
(1 = la de más arriba). Funciona, pero es más seguro fijar los IDs:

1. Deja ZCMMD001 abierta justo en la pantalla donde se ven las 3 opciones.
2. `Alt + F8` → `DiagnosticoZCMMD001` → genera `ZCMMD001_diagnostico.txt` en el Escritorio
   y lo abre en el Bloc de notas.
3. Copia los IDs de la sección **OPCIONES (RADIO BUTTONS)** a la configuración:

```vb
Private Const ID_OPCION_1    = "wnd[0]/usr/radXXXX"
Private Const ID_OPCION_2    = "wnd[0]/usr/radYYYY"
Private Const ID_OPCION_3    = "wnd[0]/usr/radMCON"
```

## Qué se corrigió respecto del script grabado

**`ERROR 619: The control could not be found by id.` en la etapa "Cargando Tipo Recepción"**

El script anterior partía escribiendo directamente en `wnd[0]/usr/txtTIPO_RECEP`. Eso funciona
mientras se está *grabando* (la pantalla de ZCMMD001 ya está a la vista), pero al ejecutarlo
después, SAP está en el menú principal o en la pantalla en que quedó la guía anterior: ese campo
no existe ahí y SAP responde con el error 619. Ahora, **antes de cada guía**, la macro:

1. cierra cualquier ventana emergente que haya quedado abierta,
2. entra a la transacción con `/nzcmmd001`,
3. **verifica** que el campo esté en pantalla, y si no está avisa qué transacción, programa y
   dynpro está viendo en ese momento, en vez del 619 pelado.

**No quedaba guardado el documento `5000XXX`**

El script anterior terminaba en `btn[6]` / `btn[7]` y nunca leía la respuesta de SAP. Ahora,
después de grabar, se lee la **barra de estado** (`wnd[0]/sbar`) y el texto de las ventanas
emergentes, se extrae el número (primero el patrón `5` + 9 dígitos, descartando la OC, la guía
y el rol) y se escribe en la columna `Doc.`, guardando el archivo guía por guía. Si SAP devuelve
un mensaje de error, ese mensaje queda en la misma celda. Si graba pero no se encuentra número,
queda `REVISAR: <mensaje de SAP>` y avisa en pantalla.

**Las ventanas emergentes**

La grabación tenía diez `sendVKey 0` fijos, uno por línea de la grilla. Con 14 diámetros
faltaban cuatro y con 8 sobraban. Ahora se cierran en un ciclo mientras existan, se registra
el texto de cada una en la bitácora, y si alguna no se cierra con Enter se detiene con un
mensaje claro en vez de quedarse pegado.

**Otros**

- Las líneas de la grilla se cargan haciendo scroll (`firstVisibleRow`) para que
  `modifyCell` funcione también cuando la guía trae más diámetros de los que se ven.
- Se revisa el tipo de mensaje de la barra de estado después de la cabecera y después de las
  líneas: si SAP rechaza algo (`E`/`A`), esa guía no se graba y se pasa a la siguiente.
- El largo se manda siempre con coma y dos decimales (`4` → `4,00`), como en la grabación.
- La fecha se acepta como texto o como fecha de Excel y se envía como `DD.MM.AAAA`.

## Configuración (arriba del módulo)

| Constante | Qué es |
|---|---|
| `TRANSACCION` | `/nzcmmd001` |
| `ID_TIPO_RECEP`, `ID_GUIA`, `ID_OC`, `ID_FECHA`, `ID_PATENTE`, `ID_ROL` | Campos de la cabecera |
| `ID_GRID` | La grilla de trozos |
| `GC_CALIDAD`, `GC_CATEGORIA`, `GC_LARGO`, `GC_DIAMETRO`, `GC_TROZO` | Nombres de las columnas de la grilla |
| `BTN_GRABAR_1`, `BTN_GRABAR_2` | Botones de grabar (`tbar[1]/btn[6]` y `btn[7]` de la grabación) |
| `ID_OPCION_1/2/3`, `OPCION_DEFECTO` | El check list |
| `MAX_POPUPS` | Tope de ventanas emergentes por guía |

Si en tu sistema algún ID es distinto, sale en el TXT del diagnóstico.

## Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| *"No pude tomar la sesion de SAP"* | SAP no está abierto, o el scripting está deshabilitado en el cliente o en el servidor. |
| *"Este libro tiene la macro pero esta guardado como .xlsx"* | Guarda como `.xlsm`, si no Excel no puede guardar los números de documento. |
| *"No aparece el campo Tipo Recepcion"* | El usuario no tiene ZCMMD001, o la transacción abre primero otra pantalla. El mensaje indica qué transacción/dynpro está viendo. |
| *"No aparece la grilla de trozos"* | La OC, el rol o el tipo de recepción no corresponden: SAP no llegó a la pantalla de la grilla. |
| *"El Tipo Material '…' no esta en el mapeo"* | Agrega ese texto en `CargarMapeoTipoMaterial`. |
| *"Hay una ventana emergente que no se cierra con Enter"* | Mira la bitácora: el texto de esa ventana queda registrado. Suele ser un mensaje de SAP que necesita otra acción. |
| La macro escribe `REVISAR: …` en `Doc.` | Grabó pero no se encontró el número en el mensaje. Revisa en SAP si la recepción quedó creada. |

> La versión anterior, como scripts `.vbs` sueltos, quedó en el historial de git
> (commit *"Cargar las recepciones de ZCMMD001 desde el Excel de guias"*).
