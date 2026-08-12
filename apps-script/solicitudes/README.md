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
| `WebApp.gs` | `doGet`: entrega el formulario de la etapa que corresponda. |
| `lanzadores/` | Proyectos mínimos para tener **una URL propia por formulario** (opción A de abajo). |
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
4. Publica los enlaces eligiendo una de las dos opciones de la sección siguiente.

## Un enlace por formulario

Cada equipo entra por su propia página. Hay dos formas, según cuánto quieras
separar los accesos.

### Opción A — una URL distinta por equipo (recomendada)

Tres despliegues independientes: **tres URLs sin nada que se pueda editar en la
barra de direcciones** y, sobre todo, **permisos distintos por formulario**
(Producción no puede abrir el de Costos ni aunque tenga el enlace).

Se arma con los proyectos de `lanzadores/`, que no repiten lógica: usan el
proyecto principal como biblioteca.

1. En el proyecto principal: **Implementar › Administrar implementaciones ›
   Nueva versión**, y copia el **ID del proyecto** (Configuración del proyecto ›
   ID de la secuencia de comandos).
2. Para cada equipo, en [script.google.com](https://script.google.com) crea un
   proyecto nuevo:

   | Proyecto | Archivo a pegar | Etapa |
   |---|---|---|
   | Solicitudes · Costos | `lanzadores/Lanzador-Costos.gs` | `costos` |
   | Solicitudes · T&D | `lanzadores/Lanzador-TD.gs` | `td` |
   | Solicitudes · Producción | `lanzadores/Lanzador-Produccion.gs` | `produccion` |

3. En cada uno: **Bibliotecas (+)** → pega el ID del proyecto principal → última
   versión → identificador exactamente **`Solicitudes`**.
4. **Implementar › Nueva implementación › Aplicación web** en cada proyecto:
   *Ejecutar como* **Yo**, y en *Quién tiene acceso* pon el grupo de ese equipo.
5. Reparte las tres URLs. Cada una abre directo su formulario.
6. Opcional: pega esas URLs en `URLS_FORMULARIOS` (Config.gs) para que el menú
   **Solicitudes › Ver enlaces de los formularios** las muestre.

Cada vez que cambies el proyecto principal: publica una **versión nueva** y
apunta la biblioteca a esa versión en los tres lanzadores.

> Variante sin bibliotecas: copia el proyecto completo tres veces y en cada
> copia cambia solo `const ETAPA_FIJA = 'costos' | 'td' | 'produccion'`
> (Config.gs), dejando el mismo `SPREADSHEET_ID`. Mismo resultado, pero hay que
> mantener tres copias del código.

### Opción B — un solo despliegue

Más rápido de montar. Deja `ETAPA_FIJA = ''` y publica el proyecto principal:
**Implementar › Nueva implementación › Aplicación web** (*Ejecutar como* **Yo**,
*Quién tiene acceso* **Cualquier usuario de tu organización**). Los enlaces son:

```
https://script.google.com/macros/s/XXXX/exec?form=costos
https://script.google.com/macros/s/XXXX/exec?form=td
https://script.google.com/macros/s/XXXX/exec?form=produccion
```

Son tres links distintos y cada persona parte en su página, pero **cualquiera
puede cambiar el `?form=` en la barra de direcciones** y abrir otro formulario.
Si eso importa, usa la opción A o restringe por correo con `ACCESOS`.

El menú **Solicitudes › Ver enlaces de los formularios** muestra los enlaces
vigentes en cualquiera de las dos opciones.

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
cd apps-script/solicitudes/pruebas
node test.js             # flujo completo
node test-etapa-fija.js  # despliegue de una sola etapa (opción A)
```
