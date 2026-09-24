# monitor — Ver las solicitudes

Apps Script **aparte** del de entrada. Comparten el spreadsheet **Maderas** y
nada más: este solo lee, así que puede repartirse a quien deba mirar sin riesgo
de que toque nada. Los permisos que pide lo dicen: `spreadsheets.readonly`.

## Qué muestra

Una fila por solicitud, con las nueve columnas de `Registro`:

`N° Solicitud` · `Fecha` · `Usuario` · `Tipo Solicitud` · `Estado` ·
`Fecha de creación` · `SKU` · `Observación` · `Observación codificación`

En **`SKU` van los códigos, no los números de fila.** Asoman los dos primeros y
**ver más** despliega todos, con su descripción, medidas, PAK, unidad, rutas y
—como un dato más, no como el protagonista— la hoja y fila del batch input
donde quedó cada uno.

Arriba hay un buscador y dos filtros (tipo y estado). El buscador **también
entra a los códigos**: es como se llega a una solicitud cuando lo único que se
tiene a mano es el material.

## Cómo une las dos hojas

Por **`N° Solicitud`**, que es la llave: la cabecera sale de `Registro` y sus
códigos de `Registro Detalle`.

Se leen las dos hojas **enteras, una vez cada una**, y se agrupan en memoria. No
hay una consulta por solicitud: con cuatrocientas solicitudes eso serían
cuatrocientas idas al spreadsheet. Por eso *ver más* es instantáneo — despliega
lo que ya está en la página.

Si una solicitud no tiene nada en `Registro Detalle` —de antes de que existiera
esa hoja— el monitor se apaña partiendo su columna `SKU`, y lo dice.

Las columnas se buscan **por su rótulo**, no por su posición: si mañana se
agrega una columna en medio, el monitor sigue andando. Lo único que no puede
cambiar es cómo se llama cada una.

## Cómo se instala

En el spreadsheet **Maderas**: **Extensiones › Apps Script**. Eso abre el
proyecto de entrada — este va en uno **nuevo y separado**:

1. Ve a [script.google.com](https://script.google.com) › **Proyecto nuevo**.
2. Ponle nombre: *Monitor de solicitudes*.
3. **⚙ Configuración del proyecto** › marca **«Mostrar appsscript.json»**.
4. Crea los cuatro archivos y pega el contenido de `fuente/`:

| En Apps Script | Contenido |
|---|---|
| `appsscript.json` | `fuente/appsscript.json` |
| `Config.gs` | `fuente/Config.gs` |
| `Monitor.gs` | `fuente/Monitor.gs` |
| `Index.html` | `fuente/Index.html` |
| `Estilos.html` | `fuente/Estilos.html` |

Los nombres `Index` y `Estilos` tienen que quedar tal cual: el código los llama
por ese nombre.

5. **Implementar › Nueva implementación › ⚙ › Aplicación web**, *Ejecutar como*
   **Yo** y *Quién tiene acceso* **Cualquier usuario de tu dominio**.

El ID del spreadsheet ya está en `Config.gs`; no hay nada más que configurar.

## Para desarrollar

```bash
cd registromaderas/monitor/pruebas && node test.js
```

Usan el mismo simulador de Apps Script que el formulario de entrada
(`../../pruebas/mock.js`): son proyectos distintos, pero el mismo spreadsheet.
Cubren la lectura por rótulos, la unión por número de solicitud, el respaldo
por `SKU` cuando no hay detalle, y que el monitor no escriba nada.
