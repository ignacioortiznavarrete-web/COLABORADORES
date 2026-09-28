# monitor — Ver las solicitudes

Apps Script **aparte** del de entrada. Comparten el spreadsheet **Maderas** y
nada más: acá **no se escribe una sola celda**, ni el estado.

Eso es a propósito. El monitor se reparte a quien deba mirar —quien pidió,
quien espera, quien pregunta por dónde va— y ninguno de ellos debería poder
cambiar una solicitud. Los permisos lo dejan por escrito: `spreadsheets.readonly`.

## Qué muestra

Arriba, cuatro números y **un gráfico general por tiempo**: cuántas solicitudes
entraron en cada período, repartidas por el estado en que están hoy. Se agrupa
por **día, semana o mes** —se elige sola según cuánto abarque, y se puede
cambiar— y pasando el cursor por una columna sale el desglose de ese período.

Los cinco estados son un **orden**, no cinco cosas sueltas, así que el color es
una sola tinta que se va oscureciendo: mirando el gráfico de lejos se ve cuánto
de cada período ya está cerrado sin leer la leyenda. Los pasos están medidos
contra el fondo, no elegidos a ojo.

Los cuatro números son: cuántas hay, cuántas en curso, cuántas finalizadas y la
**mediana de días hasta finalizar**, que sale del recorrido de estados.

El gráfico, los números y la tabla se dibujan sobre **la misma rebanada**: lo
que dejaron pasar los filtros. Nunca se contradicen.

Abajo, una fila por solicitud, con las nueve columnas de `Registro`:

`N° Solicitud` · `Fecha` · `Usuario` · `Tipo Solicitud` · `Estado` ·
`Fecha de creación` · `SKU` · `Observación` · `Observación codificación`

En **`SKU` van los códigos, no los números de fila.** Asoman los dos primeros y
**ver más** despliega todos, con su descripción, medidas, PAK, unidad, rutas y
—como un dato más, no como el protagonista— la hoja y fila del batch input
donde quedó cada uno.

Arriba hay un buscador y dos filtros (tipo y estado). El buscador **también
entra a los códigos**: es como se llega a una solicitud cuando lo único que se
tiene a mano es el material.

Al desplegar una solicitud, antes de sus códigos va **por dónde pasó**: cada
estado por el que fue, con su fecha, hora y quién lo movió, y el actual
resaltado. **La pastilla del estado también despliega**, porque una solicitud
de uno o dos códigos no tiene botón *ver más* y su recorrido igual se tiene que
poder abrir. Pasando el cursor por encima dice desde cuándo está en ese estado.

## El estado

Una solicitud pasa por estos cinco, en orden:

**Solicitando** → **Validando información** → **Pendiente** → **Creando** →
**Finalizado**

Nace en `Solicitando` cuando se registra. **De ahí en adelante lo mueve
codificación**, escribiendo en la columna `Estado` de la hoja `Registro`. Desde
el monitor solo se ve, con su color, y se puede filtrar por él.

Cada vez que se mueve, el proyecto de entrada anota una fila en `Registro
Estados` con la fecha, la hora y quién lo hizo, y eso es lo que el monitor
muestra como recorrido. Va en su propia hoja, y no en columnas de `Registro`,
porque una solicitud puede **volver atrás** —de `Creando` a `Pendiente` y de
vuelta— y una columna por estado solo guardaría la última vez.

Un estado escrito a mano que no sea de los cinco se muestra igual: el monitor
no corrige lo que dice la hoja, lo enseña.

## Cómo une las tres hojas

Por **`N° Solicitud`**, que es la llave: la cabecera sale de `Registro`, sus
códigos de `Registro Detalle` y su recorrido de `Registro Estados`.

Se leen las tres hojas **enteras, una vez cada una**, y se agrupan en memoria.
No hay una consulta por solicitud: con cuatrocientas solicitudes eso serían mil
doscientas idas al spreadsheet. Por eso *ver más* es instantáneo — despliega lo
que ya está en la página.

Si una solicitud no tiene nada en `Registro Detalle` —de antes de que existiera
esa hoja— el monitor se apaña partiendo su columna `SKU`, y lo dice. Y si
todavía no existe `Registro Estados`, o una solicitud es anterior a que se
empezara a anotar, el monitor anda igual: esa solicitud simplemente no muestra
recorrido.

Las columnas se buscan **por su rótulo**, no por su posición: si mañana se
agrega una columna en medio, el monitor sigue andando. Lo único que no puede
cambiar es cómo se llama cada una.

## Cómo se instala

En el spreadsheet **Maderas**: **Extensiones › Apps Script**. Eso abre el
proyecto de entrada — este va en uno **nuevo y separado**:

1. Ve a [script.google.com](https://script.google.com) › **Proyecto nuevo**.
2. Ponle nombre: *Monitor de solicitudes*.
3. **⚙ Configuración del proyecto** › marca **«Mostrar appsscript.json»**.
4. Crea los cinco archivos y pega el contenido de `fuente/`:

| En Apps Script | Contenido |
|---|---|
| `appsscript.json` | `fuente/appsscript.json` |
| `Config.gs` | `fuente/Config.gs` |
| `Monitor.gs` | `fuente/Monitor.gs` |
| `Index.html` | `fuente/Index.html` |
| `Estilos.html` | `fuente/Estilos.html` |
| `Tiempo.html` | `fuente/Tiempo.html` |

Los nombres `Index`, `Estilos` y `Tiempo` tienen que quedar tal cual: el código
los llama por ese nombre.

`Tiempo.html` son las cuentas del gráfico —en qué columna cae cada fecha, dónde
empieza la semana, cuántos días tardó una solicitud—. Están aparte del resto
porque son puras, y así se pueden probar en Node sin abrir un navegador.

5. **Implementar › Nueva implementación › ⚙ › Aplicación web**, *Ejecutar como*
   **Yo** y *Quién tiene acceso* **Cualquier usuario de tu dominio**.

El ID del spreadsheet ya está en `Config.gs`; no hay nada más que configurar.

## Para desarrollar

```bash
cd registromaderas/monitor/pruebas && node test.js
```

Usan el mismo simulador de Apps Script que el formulario de entrada
(`../../pruebas/mock.js`): son proyectos distintos, pero el mismo spreadsheet.
Cubren la lectura por rótulos, la unión por número de solicitud, el recorrido
de estados —incluida una solicitud que fue y volvió—, el respaldo por `SKU`
cuando no hay detalle, el reparto del gráfico en columnas de tiempo, y que el
monitor no escriba nada.

Lo que no se puede probar en Node —cómo se ve— se revisa en un navegador de
verdad: que no haya desborde en pantalla chica, que el globo no tape la columna
que se está mirando, y el contraste de cada texto medido pintándolo, no leyendo
el `oklch()` a mano.
