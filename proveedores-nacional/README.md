# Proveedores nacional — el correo de "Pendiente Licitaciones" no sale

Planilla **ProvChileSantiago**
(`1QH4y2H5b0wZ-03Jn7GuSionNKFJI-83D_DSSnj95SlU`).

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

## Entonces el problema está en el disparador

`alCambiarEstadoRegistro` es un disparador **instalable**, y falla en silencio
en varios casos. Todos terminan igual: el estado queda puesto y nadie recibe
nada.

1. El disparador no está instalado, o lo instaló otra persona y esa cuenta
   perdió la autorización.
2. El código quedó en un proyecto que apunta a otra planilla. Como tienes un
   proyecto para la hoja y otro para los formularios, es fácil que pase, y no
   da ningún error.
3. `PropertiesService.getDocumentProperties()` devuelve `null` en un proyecto
   que no está ligado a una planilla. El código lo usa sin comprobarlo, revienta
   antes de enviar y el error se queda en el registro.
4. La marca `NOTIF_LICIT_<rut>` ya estaba puesta de una prueba anterior. La fila
   se salta sin avisar.
5. El estado no se escribió con una edición manual. **`onEdit` no se ejecuta**
   cuando el valor lo pone un script, una importación o la API.
6. Cuota de correo agotada.

## Cómo usar este archivo

`DiagnosticoLicitaciones.gs` se pega **en el mismo proyecto de Apps Script de
la planilla**, junto al archivo de notificaciones. No toca el código existente:
reutiliza `notifEnviarCorreoLicitaciones_` y las mismas marcas, así que nunca
manda dos veces el mismo aviso.

### 1. Diagnosticar

```
diagnosticarLicitaciones()
```

Solo lee, no envía nada. Revisa las seis causas de arriba una por una y termina
con la conclusión. El resultado sale en **Registro de ejecución**.

### 2. Recuperar los avisos que nunca salieron

```
reenviarLicitacionesPendientes()
```

⚠ **Envía correo de verdad** a `NOTIF_DESTINO_LICITACIONES` por cada proveedor
en `Pendiente Licitaciones` que no tenga marca. Hoy son los dos de arriba.

### 3. Que no vuelva a pasar

```
instalarRedDeSeguridadLicitaciones()
```

Deja un disparador por tiempo que revisa cada 15 minutos y manda lo que quedó
sin aviso. Desde ahí el correo ya no depende de que el `onEdit` alcance a
correr: si el estado lo pega alguien, lo escribe otro script o el disparador
falla, el aviso igual sale con unos minutos de atraso.

Es la única forma de cerrarlo del todo, porque `onEdit` no se ejecuta para
cambios que no sean una edición manual.

### Otras

| Función | Qué hace |
|---|---|
| `desinstalarRedDeSeguridadLicitaciones()` | quita el disparador por tiempo |
| `limpiarMarcasLicitaciones()` | borra las marcas `NOTIF_LICIT_*` para poder probar cambiando el estado a mano |

## Un detalle aparte

La validación de datos de la columna `Estado` llega hasta **C40**, y la hoja
tiene justo 40 filas. La fila 41 que entre por el formulario va a quedar **sin
lista desplegable**. Conviene estirar el rango.
