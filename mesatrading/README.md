# mesatrading — Mesa de compra de madera

Apps Script sobre el spreadsheet **Seguimiento Trading**
(`1eUhuOkA1e4-DysFiy1IrhmovTkJURfU5QKDSBMBroYc`).

Una sola pantalla donde se ve, por cada pedido de trading: cuánto volumen
falta, a qué proveedor se le compra, para cuándo se comprometió, y qué se
conversó entre ventas y compras. Trae un **modo reunión** para proyectar.

La planilla sigue siendo la de siempre: la mesa lee y escribe sobre las mismas
hojas, sin mover ni renombrar nada de lo que ya está.

---

## Cómo se instala

Cinco pasos, una sola vez. **Todo el código es un solo archivo: `Codigo.gs`.**

### 1. Abre el editor

En el spreadsheet: **Extensiones › Apps Script**.

### 2. Pega el código

Verás un `Código.gs` con un `function myFunction() {}` vacío. Borra todo y pega
el contenido de **`Codigo.gs`** de esta carpeta. Guarda con `Ctrl+S`.

No hay que crear ningún archivo `.html`: van incrustados adentro.

### 3. Prepara las hojas

En el selector de funciones de arriba elige **`instalarMesaTrading`** y pulsa
**Ejecutar**.

Google pedirá permisos: *Revisar permisos › elige tu cuenta › Configuración
avanzada › Ir a (nombre del proyecto) › Permitir*. La pantalla de “app no
verificada” es normal en scripts propios.

Al terminar:

- la `Hoja Unica` tiene sus columnas nuevas (ver [Qué se agrega](#qué-se-agrega-a-la-planilla));
- existen las hojas `Bitacora` e `Historial Volumen`;
- los pedidos de `Bd` que faltaban están bajados;
- queda una sincronización automática cada hora.

### 4. Publica la mesa

**Implementar › Nueva implementación › ⚙ › Aplicación web**

| Campo | Valor |
|---|---|
| *Ejecutar como* | **Yo** |
| *Quién tiene acceso* | **Cualquier usuario de masisa.com** |

⚠️ Tiene que decir **“de masisa.com”**, no “Cualquier usuario” a secas. De ese
segundo modo Google no entrega el correo del visitante y la bitácora queda sin
autor.

### 5. Reparte el enlace

Copia la URL y mándala a ventas y a compras. También aparece el menú
**Mesa Trading** dentro del spreadsheet, con la mesa y el panel lateral.

Listo.

---

## Qué resuelve

La mesa nació de mirar cómo se estaba usando la planilla. Cinco cosas que
pasaban y ahora no:

### 1. La fecha del proveedor vivía escondida en un comentario

En la columna `Comentarios` había cosas como `20 julio`, `31 julio`,
`FIN AGOSTO`, `Negociación ASERMAIN 21 AGOSTO`. Eso **es** la fecha en que el
proveedor promete entregar, pero como era texto libre no se podía filtrar,
ordenar ni comparar, y alguien la pasaba a fecha a mano en otra hoja.

Ahora hay una columna **`Fecha Compromiso Proveedor`** de verdad. Al escribir
se puede seguir tecleando en castellano y la mesa muestra al instante cómo la
va a guardar:

| Lo que se escribe | Lo que se guarda | |
|---|---|---|
| `20 julio` | 20-07-2026 | |
| `5/08/2026` | 05-08-2026 | |
| `FIN AGOSTO` | 31-08-2026 | aproximada |
| `mediados de septiembre` | 15-09-2026 | aproximada |
| `Negociación ASERMAIN 21 AGOSTO` | 21-08-2026 | |
| `aserradero`, `sin fecha` | queda vacía | |

Lo que ya estaba escrito **se lee solo**: los comentarios existentes aparecen
interpretados desde el primer día, y la mesa avisa cuántos leyó así para que se
revisen y se guarden.

### 2. No se veía cuándo el proveedor llega tarde

Es el número que ordena la reunión: **desfase** = cuántos días después del
embarque comprometido con el cliente promete entregar el proveedor.

Un pedido con embarque el 30-06 y un `FIN AGOSTO` en el comentario llega **62
días tarde**. Eso antes había que calcularlo a ojo, pedido por pedido. Ahora
sale en la tabla, en el indicador de arriba y en la pauta de la reunión.

### 3. Los comentarios se pisaban unos a otros

Había un solo campo de comentario por pedido: el mensaje nuevo borraba el
anterior, y no quedaba quién lo escribió ni cuándo.

Ahora cada mensaje se **suma** a la hoja `Bitacora` con área (Ventas o
Compras), autor y fecha, y en la mesa se ve como una conversación. La celda de
`Comentarios` de la Hoja Unica sigue mostrando el último mensaje, así que la
tabla dinámica de siempre no cambia.

### 4. Se escribía encima de datos buenos

La columna 7 de la Hoja Unica **se llama** `Puerto Destino` y **contiene**
puertos (`CALLAO, PERU`, `PORT OF SPAIN`, `ACAJUTLA`). El código anterior
escribía ahí los comentarios de compra, porque ubicaba las columnas por
posición fija.

Ahora las columnas se buscan **por nombre**, y lo que falta se agrega al final
sin tocar nada. Hay una prueba que lo verifica.

### 5. Columnas del seguimiento que nunca se pintaban

La tabla dinámica tiene encabezados de fecha en formatos mezclados:
`30/04/2026`, `15-06-2026`, `5/08/2026`. La comparación anterior era entre
textos, así que `5/08/2026` (día de un dígito) no calzaba nunca con el
`05-08-2026` de `Bd`: esa columna quedaba en blanco sin avisar.

Ahora las fechas se comparan como fechas, no como texto.

**Además**, la tabla de seguimiento se pinta **por lotes**: ~110 materiales por
~13 fechas eran más de mil llamadas de una en una, y se acababa el tiempo de
ejecución. Ahora son dos llamadas. Guardar un pedido tampoco repinta la
planilla completa: escribe su fila y sigue.

---

## Cómo se usa

### La mesa

Tres vistas, con el mismo detalle a la derecha:

- **Mesa** — la tabla. Cada fila muestra embarque, cuánto falta por embarcar
  sobre el total vendido, proveedor, compromiso y la última conversación. La
  barra de color de la izquierda marca lo que necesita decisión.
- **Tablero** — columnas por estado. Se arrastra una tarjeta de una columna a
  otra para cambiarle el estado.
- **Proveedores** — cuánto volumen le estamos comprando a cada uno.

Arriba se filtra por texto, estado, proveedor y urgencia. `/` salta al buscador.

### El modo reunión

El botón **Modo reunión** abre una presentación a pantalla completa, en oscuro
y con letra grande. Las láminas se arman solas con los datos del momento:

1. Los números de la mesa.
2. Una lámina por cada motivo que pide decisión: hay que asignar proveedor,
   el proveedor llega tarde, vencidos todavía abiertos, sin fecha.
3. Dónde está el volumen, por proveedor.
4. Cómo vamos, por estado.

Se avanza con `→` / espacio, se vuelve con `←` y se sale con `Esc`. Cada pedido
con alerta aparece en **una sola** lámina: la pauta no repite.

### El panel lateral

Desde el menú **Mesa Trading › Panel lateral**, para trabajar sin salir de la
planilla. Tiene tres pestañas: el pedido de la fila seleccionada, la lista de
pendientes (tocar uno lleva a su fila) y el alta de proveedores.

---

## Qué se agrega a la planilla

Nada se borra ni se reordena. Se agregan al final las columnas que falten:

| Hoja | Columnas que se agregan |
|---|---|
| `Hoja Unica` | `Estado`, `Fecha Compromiso Proveedor`, `Comentarios Compra`, `Ultima Actualizacion` |
| `Bitacora` (nueva) | Fecha, Clave pedido, Documento de venta, Material, Area, Autor, Mensaje, Estado, Proveedor, Fecha compromiso |
| `Historial Volumen` | se respeta la que ya existe |

Las columnas que ya están se reconocen por su nombre actual, incluidos los
nombres desprolijos: `Hoja`, `PV`, `MAterial`, `Descripcion Material`.

### Los estados

`Pendiente` → `Negociación` → `Asignado` → `Confirmado` → `Cerrado`

Se eligen de un desplegable. Si la columna `Estado` está vacía, la mesa lo
deduce de lo que ya hay escrito (`Completa` es `Cerrado`, `negociación` es
`Negociación`, con proveedor y fecha es `Confirmado`), así que no hay que
rellenar 200 filas a mano para empezar.

### Los proveedores

Se administran en la hoja `Proveedores` o desde el panel lateral. La columna
`Color` acepta un nombre del catálogo (`Verde`, `Azul`, `rojoFuerte`…) o un HEX
propio (`#88CCFF`). Ese color es el que se usa para pintar la tabla de
seguimiento.

---

## Si algo no calza

La mesa avisa en pantalla en vez de mostrar una tabla vacía sin explicación:

- **“Ninguna fila de Bd dice trading en la columna Origen”** — en la planilla
  real esa columna viene vacía en la mayoría de las filas. Cuando ninguna
  calza, la mesa muestra todas y lo dice. Para cambiar el criterio, edita
  `FILTRO_ORIGEN` en `Config.gs`.
- **“N pedidos de Bd todavía no están en la mesa”** — pulsa *Sincronizar*.
- **“N pedidos de la Hoja Unica ya no aparecen en Bd”** — quedan sin volumen ni
  fechas; normalmente son pedidos anulados.
- **“N comentarios se leyeron como fecha de compromiso”** — revísalos y
  guárdalos para dejarlos fijos en su columna.

---

## Para desarrollar (opcional)

`Codigo.gs` es **generado**. Si vas a modificar bastante, conviene trabajar con
los fuentes de `fuente/` y regenerarlo:

```bash
cd mesatrading && node fuente/construir.js
```

| Archivo | Qué hay |
|---|---|
| `fuente/Config.gs` | Hojas, estados, colores, y el intérprete de fechas escritas en texto. |
| `fuente/Esquema.gs` | Ubica las columnas por nombre y prepara/repara las hojas. |
| `fuente/Datos.gs` | Arma el modelo de la mesa: pedidos, urgencia, desfase, indicadores y pauta. |
| `fuente/Acciones.gs` | Todo lo que escribe: guardar, bitácora, consolidar, pintar por lotes. |
| `fuente/WebApp.gs` | `doGet`, menú y panel lateral. |
| `fuente/Mesa.html` | La mesa y el modo reunión. |
| `fuente/Panel.html` | El panel lateral. |
| `fuente/Estilos.html` | Estilos compartidos por las dos pantallas. |
| `pruebas/` | Simulador de Apps Script y pruebas. |

```bash
cd mesatrading
node pruebas/test.js                    # sobre los fuentes
ARCHIVO_UNICO=1 node pruebas/test.js    # sobre el Codigo.gs generado
```

Las pruebas montan una planilla que imita a la real (los mismos encabezados
desprolijos, los mismos formatos de fecha mezclados, los mismos comentarios
escritos a mano) y verifican, entre otras cosas, que la columna de puertos no
se pise, que `FIN AGOSTO` se lea como 31-08-2026, que el desfase dé 62 días y
que la columna `5/08/2026` del seguimiento sí se pinte.
