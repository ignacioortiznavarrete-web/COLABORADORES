# registromaderas — Registro de requerimientos (PT · PCP · PP)

Apps Script sobre el spreadsheet **Maderas**
(`15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE`).

Un formulario web que pregunta paso a paso, busca el código en la base y guarda
la solicitud en la hoja que corresponde y en la bitácora `Registro`.

---

## Qué pregunta, en orden

| Paso | Pregunta | Opciones |
|---|---|---|
| 1 | Clase de requerimiento | **PT** Producto Terminado · **PCP** Producto Cepillado Proceso · **PP** Producto de Proceso |
| 2 | Origen | **Trading** (elige centro: TCP1 o TCD2) · **Planta** (queda fijo en TCP1) |
| 3 | Tipo de material | **TTAS** · **TPAS** |
| 4 | Código del material | 16 caracteres. Se busca en `BD_Maderas` y se muestra lo que trae asociado |
| 5 | Cantidad de piezas | Entero mayor que cero |

La clase del paso 1 decide la hoja de destino: PT → `PT`, PCP → `PCP`, PP → `PP`.

Al terminar hay un resumen antes de guardar, y después de guardar se puede
**registrar otro código** conservando clase, origen, centro y tipo de material.

## Qué se completa solo

Nadie lo escribe, lo pone el sistema:

| Dato | Valor |
|---|---|
| País | `CL` |
| Tipo Requerimiento | `No` |
| Clase Requerimiento | la que se eligió en el paso 1 |
| Llegada requerimiento | fecha y hora del ingreso |
| Usuario Solicitante | correo de quien está usando el formulario |

## Dónde queda cada solicitud

Se escriben **dos filas**, una en cada lugar.

### 1. La hoja de la clase (`PT`, `PCP` o `PP`)

Los encabezados de esas hojas están en la **fila 2**, así que los datos entran
desde la fila 3. Se escriben solo estas columnas:

| Columna de la hoja | Qué recibe |
|---|---|
| País | `CL` |
| Centro | TCP1 o TCD2 |
| Clase Requerimiento | PT, PCP o PP |
| Tipo Requerimiento | `No` |
| Llegada requerimiento | fecha y hora |
| Usuario Solicitante | correo |
| Espesor · Ancho · Largo | la medida del material (ver más abajo) |
| PAK | cantidad de piezas |
| UMB PZA ó M3 | `PZA` |

**Las columnas del desglose no se tocan**: `Aserradero(Template)`,
`Secado(Template)`, `Cepillado(Template)`, `Empaquetado`, sus `Tamaño
dimensión`, `EE`, `AA` y los rendimientos quedan en blanco, esperando las
asociaciones que faltan por definir.

### 2. La hoja `Registro`

Es la bitácora completa del formulario. Sus encabezados los crea el script la
primera vez:

`Fecha · Solicitante · País · Clase Requerimiento · Tipo Requerimiento · Origen ·
Centro · Tipo Material · Código · Descripción Material · Grupo Artículo ·
Piezas · UMB · Espesor · Ancho · Largo · Hoja Destino · Fila Destino`

Las dos últimas columnas dicen en qué hoja y en qué fila quedó la solicitud, así
que desde la bitácora siempre se puede llegar a la fila original.

---

## Cómo se instala

Cinco pasos, una sola vez. **Todo el código es un solo archivo: `Codigo.gs`.**

### 1. Abre el editor

En el spreadsheet **Maderas**: **Extensiones › Apps Script**.

### 2. Pega el código

Borra el `function myFunction() {}` que viene y pega el contenido de
**`Codigo.gs`** de esta carpeta. Guarda con `Ctrl+S`.

No hay que crear ningún archivo `.html`: van incrustados dentro.

### 3. Prepara las hojas

En el selector de funciones elige **`instalarRegistro`** y pulsa **Ejecutar**.

Google pedirá permisos: *Revisar permisos › elige tu cuenta › Configuración
avanzada › Ir a (nombre del proyecto) › Permitir*. La pantalla de "app no
verificada" es normal en scripts propios.

Al terminar revisa el mensaje: dice si falta alguna hoja o alguna columna, y
deja la hoja `Registro` con sus encabezados.

### 4. Publica

**Implementar › Nueva implementación › ⚙ › Aplicación web**

| Campo | Valor |
|---|---|
| *Ejecutar como* | **Yo** |
| *Quién tiene acceso* | **Cualquier usuario de tu dominio** |

⚠️ Tiene que decir **"de tu dominio"**, no "Cualquier usuario" a secas. De ese
segundo modo Google no entrega el correo del visitante y se pierde el registro
de quién pidió qué. Si eso pasa, el formulario **bloquea** el guardado en vez de
anotar una solicitud sin solicitante.

### 5. Reparte el enlace

Copia la URL y mándala. Si quieres que alguien entre con la clase ya elegida,
agrégale al final `?clase=PT`, `?clase=PCP` o `?clase=PP`. El menú **Registro
Maderas › Ver enlace del formulario** te los muestra armados.

---

## Decisiones que conviene revisar

Todas se cambian en `ACCESOS`, `CFG`, `CODIGO`, `POR_DEFECTO` y `MAPEO_DESTINO`,
arriba del `Codigo.gs`.

**La hoja de la base se llama `BD_Maderas`.** En el spreadsheet no hay ninguna
hoja llamada `BD`; las hojas son `BD_Maderas`, `PT`, `PCP`, `PP` y `Registro`.
Si le cambias el nombre, ajusta `CFG.HOJA_BD`.

**El código se exige de 16 caracteres exactos.** Ojo con esto: de las 41.816
filas de `BD_Maderas`, 28.497 tienen 16 caracteres, pero 11.872 tienen 11
(los `C2C 019X075`, `C2CR019X090`, casi todos TPAS). Con la regla de 16 esos
códigos no se pueden registrar. Para permitirlos:

```js
const CODIGO = { LARGO: 0, ... };   // 0 = no validar el largo
```

**Los códigos con espacios raros igual se encuentran.** Hay 15 filas en
`BD_Maderas` con un espacio duro pegado al final (`RSFR037X130X3600 `). El
formulario los reconoce igual y guarda el código limpio.

**La cantidad de piezas va a la columna `PAK`.** Es la única columna de conteo de
las hojas PT/PCP/PP. Si `PAK` significa otra cosa en tu operación, borra esa
línea de `MAPEO_DESTINO`: la cantidad igual queda guardada en `Registro`.

**Espesor, ancho y largo se deducen de la medida.** Primero de la descripción de
`BD_Maderas` y, si ahí no hay, del propio código. Se hace en ese orden a
propósito: en códigos como `C23H001X006X0013` los números **no** son la medida
(la real, `019X150X4000`, está en la descripción).

**El código tiene que existir en `BD_Maderas`.** Si no está, no se guarda. Para
permitir códigos nuevos, `CODIGO.EXIGIR_EN_BD = false`.

**Si el TpMt de la base no coincide con el tipo elegido, solo avisa.** Deja
guardar igual. Para bloquear, `CODIGO.EXIGIR_TIPO_MATERIAL = true`.

---

## Cuando definas las asociaciones del código

Las columnas del desglose (aserradero, secado, cepillado, empaquetado y sus
tamaños) se completan agregando líneas a `MAPEO_DESTINO`:

```js
const MAPEO_DESTINO = {
  'País': 'pais',
  ...
  'Secado(Template)': 'secadoTemplate'   // <- nueva
};
```

La clave es el **encabezado exacto de la fila 2** de la hoja (no distingue
mayúsculas ni acentos) y el valor es un dato de `datosParaHoja_`, en
`Registro.gs`. Ahí se agrega cómo se calcula:

```js
function datosParaHoja_(v) {
  return {
    ...
    secadoTemplate: v.codigo.substring(0, 4)   // lo que corresponda
  };
}
```

Una columna que no esté en el mapa nunca se escribe, y una del mapa que no
exista en la hoja se ignora sin romper nada.

## Quién puede entrar

Por defecto entra cualquiera que tenga el enlace (dentro del dominio). Para
limitarlo, pon los correos en `ACCESOS`:

```js
const ACCESOS = ['ana@empresa.com', 'beto@empresa.com'];
```

El permiso se revisa **también al guardar**, no solo al abrir la página.

---

## Para desarrollar (opcional)

`Codigo.gs` es **generado**. Si vas a modificar bastante, trabaja con los
fuentes de `fuente/` y regenéralo:

```bash
cd registromaderas && node fuente/construir.js
```

| Archivo | Qué hay |
|---|---|
| `fuente/Config.gs` | Spreadsheet, clases, orígenes, centros, validaciones, `MAPEO_DESTINO`, `ACCESOS`. |
| `fuente/Registro.gs` | Búsqueda en la base, validación y escritura. La API que usa el formulario. |
| `fuente/Setup.gs` | Revisa las hojas, crea `Registro`, menú del spreadsheet. |
| `fuente/WebApp.gs` | Entrega el formulario. |
| `fuente/*.html` | Formulario y estilos. |
| `pruebas/` | Simulador de Apps Script + pruebas. |

```bash
cd registromaderas/pruebas
node test.js                    # sobre los fuentes
ARCHIVO_UNICO=1 node test.js    # lo mismo, sobre el Codigo.gs generado
```

Las pruebas levantan las hojas con los mismos encabezados que tiene hoy el
spreadsheet, así que si alguien cambia una columna, se nota ahí.
