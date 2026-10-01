# alertas — Los correos que salen de codificación

Apps Script **aparte** del de entrada y del monitor. Comparte el spreadsheet
**Maderas** y nada más: acá **no se escribe una sola celda**.

## Por qué es un proyecto aparte

Un correo de Apps Script sale de la cuenta con la que corre el script. El
formulario corre con la cuenta de quien lo publicó, así que desde ahí jamás
saldría un correo de codificación. Un disparador instalable, en cambio, corre
con la cuenta de **quien lo instaló**: por eso esto vive aparte.

## El alias: sale de codificación sin entrar a codificación

A una casilla corporativa no siempre se puede entrar. Y aunque se pudiera,
mover el estado desde ella **borraría de la bitácora quién lo movió de
verdad** — y esa trazabilidad es justamente para lo que está `Registro
Estados`.

La salida es el **alias de Gmail**. Si la dirección de codificación está
agregada y verificada en *Enviar como* de la cuenta que instala el disparador,
el correo sale **con esa dirección** aunque lo mande otra cuenta. Entonces:

- cada quien mueve el estado **con su propio correo**, que es lo que queda
  anotado en `Registro Estados`
- el aviso igual se ve salido de **codificación**
- y el correo dice **quién la finalizó**, para que eso tampoco se pierda

### Cómo se agrega el alias

En Gmail de la cuenta que va a instalar el disparador:

**⚙ Ver toda la configuración › Cuentas e importación › "Enviar como" ›
Añadir otra dirección** → `codificacion.corporativa@masisa.com` → verificar.

Google manda un código a esa casilla para confirmarlo. Si no tienes acceso a
ella, alguien que sí lo tenga te pasa el código, o un administrador del dominio
te delega la dirección.

### Si no se puede agregar el alias

El correo **sale igual**, desde la cuenta que instaló el disparador: un aviso
que no llega es peor que uno que llega del remitente equivocado. Lo que no
hace es callarlo — `instalarAlertas` y `probarCorreo` lo dicen con todas sus
letras, y el resultado del envío también.

## Quién manda qué

| Cuándo | Qué dice | Sale de | Dónde vive |
|---|---|---|---|
| Se registra una solicitud | hay códigos nuevos que crear | quien pidió | `fuente/` (el formulario) |
| Estado pasa a `Creando` | **Material creado**, con el detalle | nosotros | `fuente/` (el disparador) |
| Estado pasa a `Finalizado` | código registrado, costo plan liberado, y quién la cerró | **codificación**, por el alias | **acá** |

Cada correo sale de **una sola parte**. Si los dos proyectos mandaran el mismo,
llegarían dos iguales.

Al poner `Finalizado` el proyecto de entrada además da de alta los materiales
en `BD_Maderas`. Eso es escribir, y por eso sigue allá: este proyecto solo lee.

## El estado se maneja en `Registro`

En esa hoja y en ninguna otra parte. Este disparador mira **una columna de una
hoja** —`Estado` en `Registro`— y cualquier otra edición del spreadsheet la
devuelve sin hacer nada: otra columna, otra hoja, o borrar la celda.

La hoja `Registro Estados` no es un segundo lugar donde manejarlo: solo anota
lo que ya pasó, para poder mirarlo después.

## Cómo se agrega otro aviso

En `Config.gs`, la lista `AVISOS`. Una entrada por estado que deba mandar
correo:

```js
const AVISOS = [
  {
    estado: 'Finalizado',
    asunto: 'Código registrado · costo plan liberado',
    encabezado: ['Tu solicitud {numero} quedó finalizada.', '', '...']
  }
];
```

`{numero}` se reemplaza por el número de la solicitud. Debajo del encabezado va
siempre el detalle de los códigos, uno por línea. El estado se compara sin
tildes ni mayúsculas, así que una diferencia de acento no lo rompe.

No agregues acá `Creando`: ese correo sale del proyecto de entrada, y tenerlo
en los dos mandaría dos.

## Cómo se instala

**Lo instala quien tenga el alias de codificación en "Enviar como"** (ver
arriba). Sin alias, los correos saldrán de esa persona y no de codificación.

1. Entrar a [script.google.com](https://script.google.com) › **Proyecto nuevo**.
2. Ponerle nombre: *Alertas de codificación · Maderas*.
3. **⚙ Configuración del proyecto** › marcar **«Mostrar appsscript.json»**.
4. Crear los tres archivos y pegar el contenido de `fuente/`:

| En Apps Script | Contenido |
|---|---|
| `appsscript.json` | `fuente/appsscript.json` |
| `Config.gs` | `fuente/Config.gs` |
| `Alertas.gs` | `fuente/Alertas.gs` |

5. Elegir la función **`instalarAlertas`** y darle **Ejecutar**. Google va a
   pedir permisos: aceptarlos. Avisa con qué cuenta quedó.
6. Elegir **`probarCorreo`** y **Ejecutar**. Manda uno de prueba a esa misma
   cuenta y dice qué pasó.

No hay nada que publicar: esto no es una página, es un disparador.

El ID del spreadsheet ya está en `Config.gs`.

### Si Google no deja instalar el disparador

Los permisos piden el spreadsheet de **solo lectura**, que es lo que este
proyecto necesita: lee `Registro` y `Registro Detalle` y manda correos. Si al
correr `instalarAlertas` Google reclama permisos sobre el spreadsheet, cambiar
en `appsscript.json`:

```
https://www.googleapis.com/auth/spreadsheets.readonly
```

por

```
https://www.googleapis.com/auth/spreadsheets
```

y volver a autorizar. El código sigue sin escribir nada —las pruebas lo
revisan— pero el permiso queda más ancho de lo necesario.

## Si no llega el correo

Correr **`probarCorreo`** desde el editor. Dice cinco cosas:

- con qué cuenta corre
- **de qué dirección va a salir el correo** — y si no es la de codificación,
  qué alias tiene esa cuenta y cómo agregar el que falta
- cuánta cuota de correo queda hoy
- cuántos disparadores hay instalados — si dice **0**, nunca se corrió
  `instalarAlertas` y por eso no pasa nada
- **un ensayo sobre la última solicitud**, sin mandar nada: sigue el mismo
  camino que el disparador y dice en qué paso se corta

El ensayo es el que contesta de verdad. El corte más común:

```
✗ "Registro Detalle" NO tiene una columna rotulada "Correo".
  Sus rótulos son: N° Solicitud | Fecha | Solicitante | Clase Requerimiento | …
  Por eso no sale el aviso: no hay de dónde sacar a quién escribirle.
```

La columna `Correo` se agregó al detalle después de que la hoja ya existía, y
los rótulos no se tocan cuando una hoja tiene datos —así no se pisa lo de
nadie—. El dato **sí está escrito** en su columna; lo que falta es el rótulo, y
quien lee por rótulo se lleva un vacío. Se arregla con **Registro Maderas ›
Preparar hojas** en el spreadsheet, que ahora dice exactamente qué rótulo falta
y en qué columna va.

Un correo que no sale no tumba nada: la solicitud ya está finalizada y los
materiales ya entraron a la base desde el otro proyecto. Pero el error de
Google queda escrito en **Ejecuciones**, tal cual.

## Para desarrollar

```bash
cd registromaderas/alertas/pruebas && node test.js
```

Usan el mismo simulador de Apps Script que el formulario de entrada
(`../../pruebas/mock.js`). Cubren qué estados mandan correo y cuáles no, que
una edición en otra columna u otra hoja no lo despierte, qué pasa cuando no hay
a quién escribirle, que un correo caído no reviente el disparador, que el
proyecto no escriba nada, que no mande lo mismo que el de entrada, que con
alias el remitente sea el de codificación y sin alias se mande igual diciéndolo,
y que el correo nombre a quien cerró la solicitud.
