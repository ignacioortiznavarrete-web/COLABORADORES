# ZCMMD001 – Carga de recepciones desde Excel

Macro de Excel que registra las recepciones de trozos en la transacción **ZCMMD001**
de R3, leyendo las guías desde la hoja `Hoja1`. Por cada guía carga la cabecera, marca
la opción del check list, llena la grilla de diámetros, **pregunta si está seguro de
guardar**, graba, captura el número de recepción (`50XXXXXX`), lo escribe en la columna
`L` y sigue con la guía siguiente.

## Las dos macros de `ZCMMD001.bas`

| Macro | Para qué sirve |
|---|---|
| `Cargar_Guias_SAP` | La carga. Es la que se usa día a día. |
| `Probar_SAP` | Diagnóstico. Muestra sistema, mandante, transacción y dynpro, si están el campo de Tipo Recepción y la grilla, **las opciones (radio buttons) de la pantalla con su ID**, y los botones de grabar con su tooltip. |

## Instalación

1. Guarde la planilla como **`.xlsm`** (Archivo → Guardar como → *Libro de Excel
   habilitado para macros*). Un `.xlsx` no guarda macros.
2. `Alt + F11` → *Archivo → Importar archivo…* → `ZCMMD001.bas`.
   Si prefiere copiar y pegar el código en un módulo, **borre la primera línea**
   (`Attribute VB_Name = "ZCMMD001"`), que solo sirve para la importación.
3. Guarde. Al abrir el archivo Excel pedirá *Habilitar contenido*.

Para un botón en la hoja: *Desarrollador → Insertar → Botón* → asignar `Cargar_Guias_SAP`.

## Uso

1. SAP abierto y con sesión iniciada (en cualquier pantalla: la macro entra sola con `/n`).
2. `Alt + F8` → `Cargar_Guias_SAP`.
3. Confirma el ambiente (sistema / mandante / usuario).
4. Por cada guía aparece el resumen y la pregunta **¿Está seguro de guardar esta
   recepción?**. El botón por defecto es *No*, así que un Enter distraído no graba.
   - **Sí** = graba y sigue con la siguiente.
   - **No** = deja la guía marcada `NO GUARDADO` y sigue con la siguiente.
5. Si una guía falla, escribe el error en la columna `L` y pregunta si desea continuar.

Para probar sin grabar: ejecútela y conteste **No** en la primera guía. Queda la pantalla
de SAP cargada tal cual para revisarla.

### Se puede volver a ejecutar sin duplicar

Se saltan las guías cuya columna `L` ya tiene un número o empieza con `GUARDADO`.
Las que quedaron con `ERROR…` o `NO GUARDADO` se reintentan.

## Formato de la hoja

Hoja **`Hoja1`**, datos desde la **fila 2**, columnas fijas:

| Col | Contenido | Va a |
|---|---|---|
| `A` | Tipo Recepción | `txtTIPO_RECEP` |
| `B` | Guía | `txtXGUIA` |
| `C` | OC | `ctxtEKKO-EBELN` |
| `D` | Fecha | `ctxt*EKPO-AEDAT` |
| `E` | Patente | `txtXPATEN` |
| `F` | Rol | `txt*ZTMMMD001-ROL_PRE` |
| `G` | Calidad | columna `CALIDAD` de la grilla |
| `H` | Categoría | columna `CATEGORIA` |
| `I` | Largo | columna `LARGO` (se envía como `4,00`) |
| `J` | Diámetro | columna `DIAMETRO` |
| `K` | Cantidad | columna `TROZO` |
| `L` | **La escribe la macro**: N° de recepción o error | — |
| `M` | Tipo Material (1, 2 o 3; vacío = opción por defecto) | radio button |

Cada guía es un bloque: la fila con dato en `B` abre la guía, las siguientes sin `B`
son más diámetros de la misma, y el bloque termina cuando aparece otra guía o una fila
sin nada entre `G` y `K`.

## Las 3 opciones del check list

De la grabación solo se conoce `radMCON`, que es la **3ª** opción, por eso está en
`RADIO_TIPO_3`. Si la columna `M` viene vacía se usa `TIPO_MATERIAL_DEFECTO` (3).

Mientras `RADIO_TIPO_1` y `RADIO_TIPO_2` estén en blanco, la macro selecciona la opción
**por posición**: lee los radio buttons de la pantalla, los ordena de arriba hacia abajo
y marca el que corresponde al número de la columna `M`. Funciona, pero conviene fijar
los ID:

1. Deje ZCMMD001 en la pantalla donde se ven las 3 opciones.
2. `Alt + F8` → `Probar_SAP`. Muestra las opciones numeradas con su ID.
3. Cópielos arriba del módulo:

```vb
Private Const RADIO_TIPO_1 As String = "wnd[0]/usr/radXXXX"
Private Const RADIO_TIPO_2 As String = "wnd[0]/usr/radYYYY"
Private Const RADIO_TIPO_3 As String = "wnd[0]/usr/radMCON"
```

## El flujo que reproduce la macro

Sacado de la grabación completa de una guía, paso por paso:

1. `resizeWorkingPane 168, 37`
2. `/nzcmmd001` + Enter
3. Cabecera: Tipo Recepción, Guía, OC, Fecha, Patente, Rol
4. **Enter hasta que aparezca la pantalla del detalle** (en la grabación son 3;
   la macro repite hasta `ENTER_CABECERA` = 6 y corta apenas ve la grilla y las opciones)
5. Marca la opción del check list
6. `modifyCell` de cada diámetro (CALIDAD, CATEGORIA, LARGO, DIAMETRO, TROZO)
7. `currentCellColumn` + `triggerModified`
8. Cierra las ventanas de validación (una por línea)
9. **Vuelve a marcar la opción del check list** — el `triggerModified` la desmarca
10. → aquí pregunta **¿Está seguro de guardar esta recepción?**
11. `tbar[1]/btn[6]` y `tbar[1]/btn[7]`
12. Presiona `btnBUTTON_1` en la ventana final y captura el número de recepción

## Qué se corrigió del código original

| Detalle | Qué pasaba | Cómo quedó |
|---|---|---|
| `AbrirTransaccion` solo mandaba `/n` si `Info.Transaction <> "ZCMMD001"` | Dentro de ZCMMD001 la transacción **sigue siendo ZCMMD001** en todas sus pantallas. Si SAP quedaba en la pantalla de la grilla (justo donde termina una grabación), no volvía a la inicial, `ID_TIPO_RECEP` no existía y salía *"No fue posible ingresar a ZCMMD001"* o el 619 | Siempre manda `/n`, cierra ventanas antes y después, y recién ahí verifica el campo |
| `Tipo Material` vacío cortaba la guía | La columna `M` de la planilla está vacía, así que **fallaban todas** con *"No se indicó Tipo Material"* | Vacío = `TIPO_MATERIAL_DEFECTO` (la 3ª opción, `radMCON`) |
| `RADIO_TIPO_1 = radMCON` | `radMCON` es la 3ª opción, no la 1ª. Y con `RADIO_TIPO_2` y `_3` vacíos, cualquier valor distinto de 1 moría en *"Falta configurar el ID SAP"* | `radMCON` pasó a `RADIO_TIPO_3`, y si falta un ID se resuelve por posición en pantalla |
| `grid.modifyCell` sin scroll | Con 14 diámetros y ~10 líneas a la vista, las últimas están fuera de la parte cargada y `modifyCell` falla | `AsegurarFilaVisible` mueve `firstVisibleRow` antes de cada línea |
| No se miraba el tipo de mensaje de la barra | Si SAP rechazaba la cabecera (OC, rol, fecha), la macro seguía como si nada y reventaba después en `Set grid = session.findById(...)` con *"The control could not be found by id"* — un 619 que en realidad era un error de datos | `RevisarMensajeSAP` corta con el texto real de SAP después de la cabecera, de las líneas y de grabar |
| `Set grid = session.findById(ID_GRID)` sin protección | Ese 619 en la etapa *Buscando grilla* | Se verifica antes y el mensaje dice qué revisar y en qué pantalla está |
| Solo se presionaba `btn[6]` | Si `btn[6]` no es el que graba, no se guardaba nada y no había número | Se presiona `btn[6]`, se busca el número; si no aparece y existe `btn[7]`, se presiona también |
| `ObtenerTextosObjetoSAP` recorría `objeto.Children` sin verificar | En controles sin hijos, con `On Error Resume Next` activo el `For` se comportaba de forma impredecible | Se lee `Children.Count` a una variable y se sale si no hay hijos |
| Solo se cerraba `wnd[1]` | Si SAP abría `wnd[2]` encima, quedaba dando vueltas | `VentanaSuperior` cierra siempre la de más arriba |
| Sin control de reproceso | Volver a ejecutar recargaba guías ya grabadas | Se saltan las que ya tienen número o `GUARDADO` en `L` |
| `ultimaFila` solo por columna K | — | Se toma la mayor entre `B` y `K` |
| `Application.ScreenUpdating = False` | Las celdas de la columna `L` no se veían actualizarse durante el proceso | Se sacó; el tiempo lo manda SAP, no el refresco de Excel |

Se mantuvo tal cual lo que ya estaba bien: `EsperarSAP` con `session.Busy`, el manejo de
etapas para los mensajes de error, `FechaSAP` con `"dd.mm.yyyy"` (no `"dd/mm/yyyy"`, que
usa el separador regional), `NumeroDecimalSAP` con `Application.International`, y
`ValorTexto` con `Format(…, "0")` para no mandar `16,0` donde va `16`.

## Configuración (arriba del módulo)

`TX_INGRESO`, `HOJA_DATOS`, `FILA_INICIO`, `SEG_ESPERA`, los `ID_…` de la pantalla,
`BTN_GRABAR_1` / `BTN_GRABAR_2`, `RADIO_TIPO_1..3`, `TIPO_MATERIAL_DEFECTO` y las
`COL_…` de cada columna del Excel. Si algún ID cambia en su sistema, `Probar_SAP` lo muestra.

## Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| *"No fue posible conectarse a SAP"* | SAP cerrado, o scripting deshabilitado (SAP Logon → Opciones → Accesibilidad y scripting → Scripting) o en el servidor (`sapgui/user_scripting`). |
| *"No fue posible ingresar a ZCMMD001"* | El usuario no tiene la transacción, o abre otra pantalla primero. El mensaje dice qué transacción, programa y dynpro está viendo. |
| *"No apareció la grilla de trozos"* | La OC, el rol o el tipo de recepción no corresponden. |
| *"Se pidió el Tipo Material N y la pantalla tiene X opciones"* | Revise la columna `M` o complete los `RADIO_TIPO_…` con `Probar_SAP`. |
| *"SAP superó 60 segundos de espera"* | Suba `SEG_ESPERA`. |
| `GUARDADO - RECEPCIÓN NO DETECTADA` en la columna `L` | Grabó pero el número no venía en el mensaje. Revise en SAP; esa guía no se reprocesa sola. |

> La versión anterior (scripts `.vbs` sueltos y un módulo con otra estructura) quedó en
> el historial de git.
