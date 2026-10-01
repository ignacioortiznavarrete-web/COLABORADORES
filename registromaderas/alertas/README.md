# alertas — Los correos que salen de codificación

Apps Script **aparte** del de entrada y del monitor. Comparte el spreadsheet
**Maderas** y nada más: acá **no se escribe una sola celda**.

## Por qué es un proyecto aparte

Un correo de Apps Script sale **siempre** de la cuenta con la que corre el
script. No hay forma de poner otro remitente, ni con `from`, ni con alias.

El formulario corre con la cuenta de quien lo publicó, así que desde ahí jamás
podría salir un correo de codificación. Un disparador instalable, en cambio,
corre con la cuenta de **quien lo instaló**. Por eso este proyecto existe y por
eso tiene que instalarlo codificación desde su propia cuenta: de esa cuenta
saldrán los avisos.

## Quién manda qué

| Cuándo | Qué dice | Sale de | Dónde vive |
|---|---|---|---|
| Se registra una solicitud | hay códigos nuevos que crear | quien pidió | `fuente/` (el formulario) |
| Estado pasa a `Creando` | **Material creado**, con el detalle | nosotros | `fuente/` (el disparador) |
| Estado pasa a `Finalizado` | código registrado, costo plan liberado | **codificación** | **acá** |

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

**Lo instala codificación, desde su cuenta.** Si lo instala otra persona, los
correos saldrán de esa otra persona.

1. Entrar a [script.google.com](https://script.google.com) con la cuenta de
   codificación › **Proyecto nuevo**.
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

Correr **`probarCorreo`** desde el editor. Dice tres cosas:

- de qué cuenta sale
- cuánta cuota de correo queda hoy
- cuántos disparadores hay instalados — si dice **0**, nunca se corrió
  `instalarAlertas` y por eso no pasa nada

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
proyecto no escriba nada, y que no mande lo mismo que el de entrada.
