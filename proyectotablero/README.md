# proyectotablero — Solicitudes: Costos → T&D → Producción

Apps Script sobre el spreadsheet **SolicitudTableros**
(`1afMUbL2OP-i3taaX33YORRPgX2kOqDAhkGzOkgcUAYg`).

Tres formularios web, uno por equipo. Todo se guarda en las hojas del
spreadsheet y queda registrado quién hizo cada cambio.

---

## Cómo se instala

Son seis pasos, una sola vez. **Todo el código es un solo archivo: `Codigo.gs`.**

### 1. Abre el editor

En el spreadsheet: **Extensiones › Apps Script**.

### 2. Pega el código

Verás un archivo `Código.gs` con un `function myFunction() {}` vacío.
Borra todo lo que hay dentro y pega el contenido de **`Codigo.gs`** de esta
carpeta. Guarda con `Ctrl+S`.

No hay que crear ningún archivo `.html`: van incrustados dentro.

### 3. Di quién usa cada formulario

Arriba del todo, en `ACCESOS`, pon los correos de cada equipo:

```js
const ACCESOS = {
  costos:     ['ana.costos@masisa.com'],
  td:         ['beto.td@masisa.com'],
  produccion: ['caro.prod@masisa.com']
};
```

Puedes poner varios correos por equipo. Si dejas un arreglo vacío `[]`, ese
formulario queda abierto a cualquiera que tenga el enlace.

### 4. Prepara las hojas

En el selector de funciones de arriba elige **`instalarSolicitudes`** y pulsa
**Ejecutar**.

Google pedirá permisos: *Revisar permisos › elige tu cuenta › Configuración
avanzada › Ir a (nombre del proyecto) › Permitir*. La pantalla de “app no
verificada” es normal en scripts propios.

Al terminar, en el spreadsheet aparecen las columnas de control, la hoja
`Historial` y el combo de Estado con las tres opciones.

### 5. Publica

**Implementar › Nueva implementación › ⚙ › Aplicación web**

| Campo | Valor |
|---|---|
| *Ejecutar como* | **Yo** |
| *Quién tiene acceso* | **Cualquier usuario de masisa.com** |

⚠️ Tiene que decir **“de masisa.com”**, no “Cualquier usuario” a secas. De ese
segundo modo Google no entrega el correo del visitante y se pierde el registro
de quién hizo cada cosa.

### 6. Reparte el enlace

Copia la URL que te da y **mándasela igual a todos**. Cada persona verá el
formulario que le corresponde según `ACCESOS`.

Listo.

---

## Cómo funciona el flujo

El estado se elige en cada hoja desde un combo con tres opciones, y la lógica es
la misma en las tres etapas:

| Estado | Qué pasa |
|---|---|
| **Aprobado** | Avanza a la hoja siguiente llevando **solo el número de solicitud**. En Producción cierra el flujo. |
| **Rechazado** | El flujo termina ahí. No continúa y la solicitud no se puede reabrir. |
| **Modificado** | Vuelve **siempre a Costos** y se **reinician los estados de las tres hojas**. Costos se reabre con todos sus campos cargados y con un **“Ver más”** que muestra lo registrado en T&D y Producción. |

- El **número de solicitud** (`SOL-00001`, `SOL-00002`, …) se genera solo en
  Costos, es correlativo y único, y es lo único que viaja entre hojas.
- Los datos de una etapa **no** se copian a la siguiente.
- Cada movimiento queda registrado en la hoja `Historial`.

## Quién puede entrar a qué

Con `ACCESOS` configurado (paso 3), el mismo enlace se comporta distinto según
quién lo abra:

- Si la persona tiene **un solo** formulario asignado, entra directo a él.
- Si tiene **varios** (una jefatura, por ejemplo), ve un selector con los suyos.
- Si intenta abrir uno ajeno escribiendo `?form=costos` en la barra de
  direcciones, ve una página de **Sin acceso**. No es cosmético: cada llamada al
  servidor revalida el permiso, así que tampoco puede guardar.

Si prefieres mandar un enlace directo a cada equipo, agrégale al final
`?form=costos`, `?form=td` o `?form=produccion`. El menú **Solicitudes › Ver
enlaces de los formularios** te los muestra armados.

## Quién hizo cada cambio

Nadie necesita acceso a la planilla: el script escribe por ellos y deja el
correo real de cada persona en tres lugares:

1. **Columnas de la fila** — `Registrado Por`, `Revisado Por`, `Fecha Estado`.
2. **Notas en la celda** — el cuadradito naranja de Sheets. Pasas el mouse por
   la celda de Estado y dice *“Aprobado por ana@masisa.com el 12-08-2026 09:40”*.
3. **Hoja `Historial`** — una línea por movimiento, con fecha, etapa, estado,
   comentario y correo.

Esto funciona gracias a la combinación del paso 5 (*Ejecutar como: Yo* + acceso
limitado al dominio). Si Google no logra identificar la cuenta, el guardado se
**bloquea** en vez de dejar una fila sin autor.

**Para que solo se pueda escribir por el formulario:** en el spreadsheet,
**Datos › Hojas y rangos protegidos**, protege `Costos`, `T&D`, `Produccion` e
`Historial` dejando solo a tu cuenta como editora. Como el script corre como tú,
el flujo sigue funcionando igual.

## Las columnas

Se respetan tal cual las que ya tenías. `instalarSolicitudes` solo **agrega al
final** las que el flujo necesita, sin borrar ni reordenar nada:

| Hoja | Tus columnas | Columnas que se agregan |
|---|---|---|
| `Costos` | numero de solicitud, Tipo de solicitud, solicitante, Material, estado de la solicitud, Respuestas, consultas | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro, **Devuelto Por**, **Motivo Devolución**, **Versión** |
| `T&D` | numero de solicitud, estado, pregunta1-3, respuesta1-3, Consultas | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro |
| `Produccion` | numero de solicitud, estado, pregunta1, Respuesta | Comentario Estado, Revisado Por, Fecha Estado, Registrado Por, Fecha Registro |

Cuando una solicitud vuelve por **Modificado**, la celda de estado queda **en
blanco** en las tres hojas: eso es el reinicio. Quién la devolvió y por qué se ve
en `Devuelto Por` / `Motivo Devolución` de Costos y en `Historial`.

## Cambiar los campos de un formulario

Todo sale del arreglo `campos` de cada etapa, dentro de `Codigo.gs`:

```js
{ id: 'material', columna: 'Material', etiqueta: 'Material', tipo: 'textarea', requerido: true }
```

- `columna`: encabezado **exacto** de la hoja.
- `etiqueta`: rótulo que se ve en el formulario.
- `tipo`: `texto` | `textarea` | `numero` | `fecha` | `lista` | `email`.
- `opciones`: solo para `lista`; crea el combo en el formulario y la validación
  en la hoja.

Después de cambiarlo, vuelve a ejecutar `instalarSolicitudes`.

Ejemplo, para que *Tipo de solicitud* sea un combo:

```js
{ id: 'tipoSolicitud', columna: 'Tipo de solicitud', etiqueta: 'Tipo de solicitud',
  tipo: 'lista', requerido: true, opciones: ['Tablero', 'Insumo', 'Servicio'] }
```

---

## Para desarrollar (opcional)

`Codigo.gs` es **generado**. Si vas a modificar bastante, es más cómodo trabajar
con los fuentes separados de `fuente/` y regenerarlo:

```bash
cd proyectotablero && node fuente/construir.js
```

| Carpeta | Qué hay |
|---|---|
| `fuente/Config.gs` | Spreadsheet, estados, campos de cada etapa, `ACCESOS`, `AUDITORIA`. |
| `fuente/Setup.gs` | Crea y repara las hojas. Menú *Solicitudes*. |
| `fuente/Solicitudes.gs` | Correlativo, transiciones de estado, historial, API. |
| `fuente/WebApp.gs` | Entrega el formulario según quién entre. |
| `fuente/*.html` | Formulario, selector, página de sin acceso y estilos. |
| `pruebas/` | Simulador de Apps Script + pruebas del flujo. |

```bash
cd proyectotablero/pruebas
node test.js                    # flujo completo y registro de autoría
ARCHIVO_UNICO=1 node test.js    # lo mismo, sobre el Codigo.gs generado
node test-accesos.js            # cada persona solo ve su formulario
```
