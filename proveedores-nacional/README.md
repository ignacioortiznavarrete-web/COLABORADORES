# Proveedores nacional — el correo de "Pendiente Licitaciones" no sale

Planilla **ProvChileSantiago**
(`1QH4y2H5b0wZ-03Jn7GuSionNKFJI-83D_DSSnj95SlU`).

El aviso sigue saliendo **solo cuando se edita el estado**. Acá no se agrega
ningún envío automático ni ningún disparador por tiempo.

## Qué se revisó en la planilla

Todo lo que depende de los datos está correcto. No es ahí donde falla:

| Revisión | Resultado |
|---|---|
| Nombre de la pestaña | `Registro`, exacto |
| Columna `Estado` | C, encabezado exacto |
| Valor del estado | `Pendiente Licitaciones`, sin espacios ni tildes raras |
| Lista desplegable de C2:C40 | contiene ese mismo texto |
| Columnas que arma el correo | RUT = R, Razón Social = H, Solicitante = D, Documento Bancario = Y, Pregunta1-3 = AB/AC/AD |
| Fórmulas en `Registro` | ninguna |

`notifClaveEstado_("Pendiente Licitaciones")` y la constante
`NOTIF_ESTADO_LICITACIONES` dan las dos `PENDIENTELICITACIONES`, así que la
comparación calza.

Quedan **dos proveedores en ese estado y sin aviso**:

- fila 26 — ROLE SPA — 77912921-7 — V°B del 31/08/2026
- fila 40 — TRANSPORTES DEL VALLE SPA — 78505466-0 — V°B del 21/09/2026

## De qué cuenta salen los correos

Un disparador **instalable corre siempre con la cuenta de quien lo instaló**,
no con la de quien edita. Si lo instalas tú, Juan cambia el estado y el correo
sale igual desde tu casilla y contra tu cuota. Eso es justo lo que se busca.

El riesgo de correos de más es el reverso: **si dos personas ejecutaron alguna
vez `instalarDisparadoresNotificaciones()`, quedan dos disparadores y sale un
correo por cada uno.** Dos avisos a licitaciones por cambio y dos resúmenes
diarios.

`ScriptApp.getProjectTriggers()` solo devuelve los disparadores de la cuenta
que ejecuta, así que desde tu cuenta no ves los de otra persona. La prueba
práctica es cambiar un estado y contar los correos que llegan: el remitente de
cada uno dice qué cuenta lo mandó.

### Para dejar una sola cuenta enviando

1. Cada persona que alguna vez instaló los disparadores entra al proyecto y
   ejecuta, **desde su cuenta**, `desinstalarDisparadoresNotificaciones()`.
2. Después, y solo tú, ejecutas `instalarDisparadoresNotificaciones()`.
3. Confirmas con `quienEnviaLosCorreos()`.

## Por qué no salió el correo

`alCambiarEstadoRegistro` es un disparador instalable y falla mudo en varias
situaciones. Todas terminan igual: el estado queda puesto y nadie recibe nada.

1. Nadie lo instaló, o lo instaló alguien que después perdió la autorización.
2. El código quedó en un proyecto que apunta a otra planilla. Con un proyecto
   para la hoja y otro para los formularios pasa fácil, y no da ningún error.
3. `PropertiesService.getDocumentProperties()` devuelve `null` en un proyecto
   que no está ligado a una planilla. El código lo usa sin comprobarlo,
   revienta antes de enviar y el error se queda en el registro.
4. La marca `NOTIF_LICIT_<rut>` quedó puesta de una prueba anterior. La fila se
   salta sin avisar.
5. El estado no se escribió con una edición manual. **`onEdit` no se ejecuta**
   cuando el valor lo pone un script, una importación o la API. Si el estado
   llegó así, hay que volver a escribirlo en la celda.
6. Cuota de correo agotada.

## Cómo usar este archivo

`DiagnosticoLicitaciones.gs` se pega **en el mismo proyecto de Apps Script de
la planilla**, junto al archivo de notificaciones. No toca el código existente:
reutiliza `notifEnviarCorreoLicitaciones_` y las mismas marcas, así que nunca
manda dos veces el mismo aviso.

| Función | Qué hace |
|---|---|
| `quienEnviaLosCorreos()` | Solo lee. Con qué cuenta saldrían los correos, qué disparadores tiene esta cuenta y si hay duplicados. |
| `diagnosticarLicitaciones()` | Solo lee. Revisa las seis causas de arriba y termina con la conclusión. |
| `reenviarLicitacionesPendientes()` | ⚠ **Envía correo de verdad**, una vez por proveedor pendiente, desde la cuenta de quien la ejecuta. Hoy son los dos de arriba. |
| `limpiarMarcasLicitaciones()` | Borra las marcas `NOTIF_LICIT_*` para poder probar cambiando el estado a mano. |

Todo sale en **Registro de ejecución**.

## Un detalle aparte

La validación de datos de la columna `Estado` llega hasta **C40**, y la hoja
tiene justo 40 filas. La fila 41 que entre por el formulario va a quedar **sin
lista desplegable**. Conviene estirar el rango.
