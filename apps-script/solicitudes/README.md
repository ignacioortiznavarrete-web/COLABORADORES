# Flujo de solicitudes: Costos → T&D → Producción

Apps Script sobre el spreadsheet **SolicitudTableros**
(`1afMUbL2OP-i3taaX33YORRPgX2kOqDAhkGzOkgcUAYg`). Tres formularios web, un
formulario por equipo, y todo el dato se guarda en las hojas del spreadsheet.

## Reglas del flujo

El estado se elige en cada hoja desde un combo con tres opciones. La lógica es
la misma en las tres etapas:

| Estado | Qué pasa |
|---|---|
| **Aprobado** | Avanza a la hoja siguiente llevando **solo el número de solicitud**. En Producción cierra el flujo. |
| **Rechazado** | El flujo termina ahí. No continúa al paso siguiente y la solicitud no se puede reabrir. |
| **Modificado** | Vuelve **siempre a Costos** y se **reinician los estados de las tres hojas**. Costos se reabre con todos sus campos cargados y con un **“Ver más”** que muestra lo registrado en T&D y Producción. |

- El **número de solicitud** (`SOL-00001`, `SOL-00002`, …) se genera solo en
  Costos, es correlativo y único, y es lo único que viaja entre hojas.
- Los datos de una etapa **no** se copian a la siguiente.
- Cada movimiento queda registrado en la hoja **Historial**.

## Archivos

| Archivo | Rol |
|---|---|
| `Config.gs` | Configuración: ID del spreadsheet, estados, **esquema de campos de cada etapa**, control de acceso. Es el único archivo que normalmente hay que tocar. |
| `Setup.gs` | Crea y repara las hojas, aplica formatos y la validación del combo de Estado. Menú *Solicitudes* en el spreadsheet. |
| `Solicitudes.gs` | Núcleo: correlativo, lectura/escritura, transiciones de estado, historial y las funciones `api*` que consume el HTML. |
| `WebApp.gs` | `doGet`: entrega el formulario según `?form=`. |
| `Formulario.html` | Formulario único, se dibuja solo a partir del esquema de la etapa. |
| `Inicio.html` | Selector de formularios (solo si se abre la URL sin `?form=`). |
| `Estilos.html` | Estilos compartidos. |
| `pruebas/` | Simulador de Apps Script + pruebas del flujo (se corren con Node, ver abajo). |

## Instalación

1. Abre el spreadsheet → **Extensiones › Apps Script**.
2. Crea los archivos con exactamente estos nombres y pega el contenido:
   - Script: `Config.gs`, `Setup.gs`, `Solicitudes.gs`, `WebApp.gs`
   - HTML: `Formulario.html`, `Inicio.html`, `Estilos.html`
3. Ejecuta la función **`instalarSolicitudes`** una vez y autoriza los permisos.
   Esto agrega a cada hoja las columnas de control que faltan (al final, sin
   tocar ni reordenar las tuyas), crea la hoja `Historial` y pone el combo de
   Estado con las tres opciones.
4. **Implementar › Nueva implementación › Aplicación web**
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier usuario de tu organización** (recomendado,
     así queda registrado el correo de quien aprueba).
5. Copia la URL y arma un enlace por equipo:

```
https://script.google.com/macros/s/XXXX/exec?form=costos
https://script.google.com/macros/s/XXXX/exec?form=td
https://script.google.com/macros/s/XXXX/exec?form=produccion
```

El menú **Solicitudes › Ver enlaces de los formularios** muestra los tres.

## Columnas

Se respetan tal cual las columnas que ya tenías. `instalarSolicitudes` solo
**agrega al final** las columnas de control que el flujo necesita:

| Hoja | Tus columnas | Columnas que se agregan |
|---|---|---|
| `Costos` | numero de solicitud, Tipo de solicitud, solicitante, Material, estado de la solicitud, Respuestas, consultas | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro, **Devuelto Por**, **Motivo Devolución**, **Versión** |
| `T&D` | numero de solicitud, estado, pregunta1-3, respuesta1-3, Consultas | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro |
| `Produccion` | numero de solicitud, estado, pregunta1, Respuesta | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro |

Las columnas de control son opcionales: si borras alguna, el código sigue
funcionando y el dato queda igual en `Historial`. Las únicas imprescindibles son
`numero de solicitud` y la de estado de cada hoja.

Nota: cuando una solicitud vuelve por **Modificado**, la celda de estado queda
**en blanco** en las tres hojas (eso es el reinicio). Quién la devolvió y por
qué se ve en `Devuelto Por` / `Motivo Devolución` de Costos y en `Historial`.

## Cambiar los campos de un formulario

Todo el formulario sale del arreglo `campos` de cada etapa en `Config.gs`:

```js
{ id: 'material', columna: 'Material', etiqueta: 'Material', tipo: 'textarea', requerido: true }
```

- `id`: identificador interno (no se muestra).
- `columna`: encabezado **exacto** de la hoja.
- `etiqueta`: rótulo en el formulario.
- `tipo`: `texto` | `textarea` | `numero` | `fecha` | `lista` | `email`.
- `opciones`: solo para `lista`; genera un combo en el formulario y la
  validación de datos en la hoja.

Después de editarlo, vuelve a ejecutar `instalarSolicitudes`.

Ejemplo para convertir *Tipo de solicitud* en combo:

```js
{ id: 'tipoSolicitud', columna: 'Tipo de solicitud', etiqueta: 'Tipo de solicitud',
  tipo: 'lista', requerido: true, opciones: ['Tablero', 'Insumo', 'Servicio'] }
```

## Restringir quién entra a cada formulario

En `Config.gs`. Arreglo vacío = cualquiera con el enlace:

```js
const ACCESOS = {
  costos:     ['costos@masisa.com'],
  td:         ['td@masisa.com'],
  produccion: ['produccion@masisa.com']
};
```

## Pruebas

`pruebas/` trae un simulador de `SpreadsheetApp` para verificar el flujo sin
tocar el spreadsheet real (aprobación en cadena, rechazo que corta, devolución
desde T&D y desde Producción con reinicio de estados, unicidad del correlativo
y validaciones):

```bash
cd apps-script/solicitudes/pruebas && node test.js
```
