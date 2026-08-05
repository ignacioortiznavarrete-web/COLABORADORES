# Configuración — actualización automática de estados SAP

Proyecto Apps Script ligado a la planilla de solicitudes de cambio
(`1s0r_lbPLVH4peQfn_2L7LqrD1Pvmk0tDw4GQR5CsfvI`).

## Qué cambió

Antes: un botón en la planilla ejecutaba `actualizarEstadosSAP()`, que aplicaba
**todos** los materiales de `USolicitud` sobre `BD` y marcaba todo lo que
estuviera en "Procesando".

Ahora: un **trigger instalable onEdit** (`alEditarRequerimiento`) reacciona
cuando en `Cambios!E` (Requerimiento) una fila pasa de **Procesando** a
**Actualizado**, y actualiza `BD!E` **sólo para el código de material de esa
fila**. Como `BD` tiene una fila por material × centro, ese único código se
actualiza en todos sus centros (TCDC, TCDT, TCDS, TCD4, TCP5, TCD2…).

## Puesta en marcha (una sola vez)

1. Pega `Codigo.gs` en el proyecto Apps Script de la planilla.
2. En el editor, ejecuta **`instalarTriggerEstados`** y autoriza los permisos.
   Verifica en *Activadores* que quede `alEditarRequerimiento` → *De hoja de
   cálculo* → *Al editar*.
3. En la planilla, borra el dibujo/botón que tenía asignado
   `actualizarEstadosSAP` (clic derecho sobre el botón → *Eliminar*). Esto es
   manual: un botón es un dibujo de la hoja, no código.

Para desactivar la automatización: ejecuta `eliminarTriggerEstados`.

## Uso diario

En `Cambios`, cambia la celda de la columna **Requerimiento** de `Procesando` a
`Actualizado`. Sirve tanto una celda como pegar/arrastrar el valor sobre varias
filas a la vez. Aparece un *toast* con cuántos materiales y cuántas filas de
`BD` se actualizaron.

## Detalles de implementación

- **Sólo la transición**: en edición de una celda se exige `Procesando →
  Actualizado`. En pegados de varias celdas Google no entrega el valor previo,
  así que se procesan todas las filas del rango que hayan quedado en
  "Actualizado" (es idempotente: `BD` sólo se escribe si el estado difiere).
- **Escrituras por lote**: `BD` se lee y se escribe con un solo `getValues()` /
  `setValues()` sobre la columna E, en lugar de un `setValue()` por fila.
- **`LockService`** evita que dos ediciones simultáneas se pisen.
- **No se toca `Cambios!F`** (Estado Actual = estado anterior capturado por el
  formulario) ni `USolicitud`, que es una hoja derivada de 2 columnas
  (`Material | Estado`). Los bucles del código anterior que buscaban
  "Procesando" en `USolicitud!E` nunca hacían nada: esas columnas están vacías.
- **Sin `SpreadsheetApp.getUi().alert()`**: falla al ejecutarse desde un
  trigger. Se usa `toast()`.
- Fecha de aplicación: desactivada por defecto (`CFG.CAMBIOS_COL_FECHA = 0`)
  para no pisar la columna F. Si quieres registrarla, agrega un encabezado
  "Fecha Actualización" en `Cambios!G` y pon `CAMBIOS_COL_FECHA: 7`.

## Respaldo manual

`procesarPendientes()` aplica de una vez todo lo que siga en "Procesando".
Úsalo si el trigger estuvo desactivado o si las filas se cargaron por script
(los triggers `onEdit` **no** se disparan con escrituras hechas por código, sólo
con ediciones de una persona en la interfaz).

`actualizarEstadosSAP()` se mantiene como alias de `procesarPendientes()` para
que un botón todavía asignado no falle durante la transición.
