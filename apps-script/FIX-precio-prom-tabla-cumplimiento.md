# Fix: "Precio prom." vacío en la tabla de cumplimiento

## Síntoma

En **Cumplimiento plan proveedores**, la columna `Precio prom.` muestra `-`
en todas las filas, aunque las tarjetas de valor y la tabla "Valor por
proveedor" sí muestran precios correctamente.

## Causa

Es un problema de **orden de renderizado en `Index.html`**, no del servidor.
`getValoresRecepcion` devuelve los precios bien; lo que falla es que la tabla
de cumplimiento nunca se vuelve a dibujar después de recibirlos.

Secuencia real:

| # | Qué ocurre | Estado de la tabla |
|---|---|---|
| 1 | `loadData()` → `renderTables()` | `DATA.detalleIngresos` es `null` → sin precios |
| 2 | `loadDetalleIngresos()` → `renderAllFiltered()` → `renderTables()` | filas cargadas, pero **sin** `precioUnitario` → sin precios |
| 3 | `getValoresRecepcion()` responde y asigna `row.precioUnitario` | **no se llama `renderTables()`** → la tabla queda como en el paso 2 |

La columna se llena así:

```
precioCell(x.valorRecepcion, x.m3Valorizados)
   ← buildFilteredCompliance()   (suma solo si row.precioUnitario existe)
   ← renderTables()
```

En el paso 3 se llaman únicamente `renderValoresBlocks()` y
`renderValorChart()`, que refrescan los KPIs de valor, la tabla "Valor por
proveedor" y el gráfico — pero **no** la tabla de cumplimiento. Por eso esa
tabla es la única que se queda con `-`.

Se confirma con un detalle: si cambias cualquier filtro, la columna aparece.
Eso ocurre porque el filtro dispara `renderAllFiltered()` → `renderTables()`,
que es justo la llamada que falta.

## Solución

En `Index.html`, dentro del `withSuccessHandler` de `getValoresRecepcion`
(bloque `ensureValoresData`), reemplazar:

```js
          renderValoresBlocks();
          renderValorChart();
```

por:

```js
          // La tabla de cumplimiento se dibujó antes de que llegaran los
          // precios. Hay que volver a renderizarla para que "Precio prom."
          // deje de mostrar "-". renderTables está envuelto más abajo, así
          // que esta llamada también refresca los bloques de valores.
          renderTables();
          renderValorChart();
```

### Por qué no genera un bucle

`renderTables` está envuelto y llama a `renderValoresBlocks()`, que a su vez
llama a `ensureValoresData(false)`. Pero esa función corta al inicio:

```js
if (!force && detalle[0].precioUnitario !== undefined) return;
```

Como en el paso 3 ya se asignó `precioUnitario` a todas las filas, la guarda
se cumple y no se vuelve a pedir nada al servidor. Verificado en la prueba.

## Verificación

`test_precio_cell.js` reproduce el flujo con las funciones copiadas tal cual
de `Index.html` (`precioCell`, `buildFilteredCompliance`, `faenaKeyClient`):

```
PASO 1-2: detalle cargado, precios AÚN NO
    SOCIEDAD BOSQUES RIO ITATA SPA | Precio prom.: -
    MARCO MORALES | Precio prom.: -

COMPORTAMIENTO ACTUAL (solo renderValoresBlocks + renderValorChart)
    SOCIEDAD BOSQUES RIO ITATA SPA | Precio prom.: -     ← bug reproducido
    MARCO MORALES | Precio prom.: -

CON EL FIX (se agrega renderTables())
    SOCIEDAD BOSQUES RIO ITATA SPA | Precio prom.: $69 /m³
    MARCO MORALES | Precio prom.: $70 /m³

SIN RIESGO DE BUCLE: renderTables tras el fix NO vuelve a pedir precios
```

## Nota aparte: el símbolo de moneda

`precioCell` usa `fmtCLP`, que antepone `$`. Los valores de la hoja están en
**USD** (`Valor Unitario USD`), así que la tabla muestra `$69 /m³` cuando
debería decir `US$69 /m³`. No afecta el cálculo, solo la etiqueta. Si se
quiere corregir, basta cambiar en `fmtCLP` el `'$'` por `'US$'`, teniendo en
cuenta que esa función también la usan las tarjetas de valor y el gráfico.
