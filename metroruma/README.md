# MetroRuma · Plan vs Ingresos — frontend

Rediseño del tablero de Google Apps Script que cruza la hoja **Plan** con
**Ingresos** y el complemento diario de **Informegmail**.

El archivo que se pega en Apps Script es **`Index.html`**, y está *generado*:
no se edita a mano. Las fuentes viven en `src/`.

```
src/styles.scss           sistema de diseño (tokens, componentes, tema claro/oscuro)
src/index.template.html   markup + lógica del tablero
build.mjs                 compila Sass y lo embebe  →  Index.html
preview.mjs               versión local con librerías de npm  →  preview/
test.mjs                  prueba de humo con Chromium
```

## Uso

```bash
npm install
npm run build     # genera Index.html
npm run watch     # regenera al guardar
npm run preview   # genera preview/index.html para abrir en el navegador
npm test          # prueba de humo: filtros, búsqueda, orden y tema
```

Luego se copia el contenido de `Index.html` en el archivo `Index` del proyecto
de Apps Script. **`Code.gs` no cambia**: el frontend consume la misma respuesta
de `getDashboardData()` que antes.

### Por qué el CSS viaja embebido

Apps Script sólo acepta archivos `.gs` y `.html`, así que no existe la opción de
enlazar una hoja de estilos. `build.mjs` compila el Sass y lo inyecta en un
`<style>` dentro del marcador `<!-- @@STYLES@@ -->` de la plantilla.

### Por qué hay una previsualización aparte

En producción el tablero carga Tailwind, Alpine, Motion y Google Charts desde
CDN, que es lo correcto dentro del iframe de Apps Script. Para revisarlo en
local sin red, `preview.mjs` reescribe esas etiquetas hacia copias instaladas
por npm y sustituye Google Charts por un doble que registra cada `draw()` en
`window.__CHARTS__`. Eso es lo que permite que `npm test` verifique también que
las series se arman bien.

## Librerías

| Librería | Para qué |
|---|---|
| **Sass** | tokens, temas y componentes; compilado en el build |
| **Tailwind** (CDN) | layout, espaciado y puntos de quiebre |
| **Alpine.js** | estado de filtros, paneles y KPI declarativos |
| **Motion One** | entrada escalonada de las tarjetas, respetando `prefers-reduced-motion` |
| **Google Charts** | los tres gráficos, re-teñidos al cambiar de tema |

Cuando una utilidad de Tailwind y una clase propia tocan la misma propiedad
tienen la misma especificidad y decide el orden de carga, que en Apps Script no
es predecible. Por eso las colisiones se resuelven con modificadores en Sass
(`.control--auto`, `.control--search`, `.kpi-value--date`) y no con utilidades.
Tailwind corre además con `preflight` desactivado, así que `styles.scss` aporta
el reset mínimo: tamaño de los `svg` y neutralizado de los `button`.

## Búsqueda

La caja de búsqueda acepta una sintaxis pequeña en lugar de un único "contiene":

| Escribir | Efecto |
|---|---|
| `savi digua` | ambos términos (Y lógico) |
| `"el capao"` | frase exacta |
| `-gmail` | excluye las filas que lo contengan |
| `proveedor:savi` | acota a un campo |
| `cantidad:>500` | comparación numérica (`>` `<` `>=` `<=` `=`) |

Campos disponibles: `proveedor`, `predio`, `rol`, `material`, `fuente`,
`estatus`, `metodo`, `cantidad`, `cumplimiento`. El texto se normaliza sin
acentos y sin distinguir mayúsculas. Mientras se escribe aparecen sugerencias
con los valores que existen de verdad en los datos, y las coincidencias quedan
resaltadas en la tabla de detalle.

Además: presets de rango de fechas, selección múltiple de proveedores con
buscador, control segmentado de fuente, filtro por estatus, chips de lo que está
aplicado (con quitado individual), orden por cualquier columna, copia a
portapapeles del CSV filtrado y atajo <kbd>/</kbd> para saltar a la búsqueda.

## Color

La paleta de series pasó los seis chequeos del método de visualización de datos
(banda de luminosidad, piso de croma, separación para daltonismo, piso de visión
normal y contraste) contra **las dos** superficies:

| Serie | Claro (`#f4f7f5`) | Oscuro (`#141a17`) |
|---|---|---|
| Ingreso real | `#1e7a4b` | `#2c9463` |
| Complemento Gmail | `#c47f13` | `#e0a536` |
| Plan | `#3873b5` | `#5b9bdd` |

Peor par adyacente bajo simulación de protanopía: ΔE 10.0 en claro y 13.5 en
oscuro, sobre un umbral de 8 (OKLab ×100). El modo oscuro no es un volteo
automático: son pasos elegidos y validados contra su propia superficie.

El par *plan del mes / plan a la fecha* es una rampa ordinal de un solo tono —
la misma entidad en dos horizontes— validada aparte. Como el paso claro queda
bajo 3:1, se envía con relieve: leyenda, etiqueta directa y la tabla completa,
de modo que la lectura nunca depende sólo del color.

## Accesibilidad

- Cada gráfico tiene su tabla equivalente en la misma página.
- La insignia de fuente combina color **y** texto (`REAL` / `GMAIL`).
- El cumplimiento se lee como cifra y como barra dentro de la celda.
- Las animaciones se apagan con `prefers-reduced-motion`.
- Los nombres de proveedor y predio se insertan con `textContent`: son datos
  que vienen de una hoja de cálculo y de correos, no marcado de confianza.
