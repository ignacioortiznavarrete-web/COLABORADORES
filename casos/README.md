# casos — Año / Hoy / Días abiertos en la Planilla Yasna

Apps Script sobre la planilla **Planilla Yasna**
(`1FfRbv_jkU17hfGLlyQ7N-0RZmsCrW1txtroOFDmc41Y`).

Cada vez que se abre la planilla, el script deja tres columnas a partir de la **E**:

| Columna | Encabezado | Qué lleva |
| :-- | :-- | :-- |
| **E** | Año | El año de la **fecha de apertura** (columna B) |
| **F** | Hoy | La fecha del día en que se ejecuta el script |
| **G** | Días casos abiertos | Días entre la **fecha de apertura** y hoy |

Las tres se reescriben **completas** en cada ejecución: desde la fila 2 hasta la
última fila con casos, pisando lo que hubiera de antes. Y si más abajo quedaron
restos de una corrida anterior (filas que ya no tienen caso), se borran.

Si esas tres columnas **todavía no están**, se insertan en la E y **todo lo que
había desde la E hacia adelante se corre a la derecha**. No se pisa ningún dato.
Si ya están —como pasa hoy en la planilla, que tiene los encabezados
"año(llenarlo atravez de appscript on open)" y compañía— el script las reconoce,
les deja el nombre limpio y solo actualiza los valores. Correrlo dos veces no
duplica columnas.

Todo el código es un solo archivo: **`Codigo.gs`**.

---

## Cómo se instala

Una sola vez.

### 1. Abre el editor

En la planilla: **Extensiones › Apps Script**.

### 2. Pega el código

Verás un archivo `Código.gs` con un `function myFunction() {}` vacío. Borra todo
y pega el contenido de **`Codigo.gs`** de esta carpeta. Guarda con `Ctrl+S`.

### 3. Revisa la zona horaria

En el editor, **⚙ Configuración del proyecto › Zona horaria**: déjala en
`(GMT-04:00) Santiago`. De ahí sale qué día es "hoy".

### 4. Autoriza el script

En el menú del editor elige la función `actualizarCasos` y dale **Ejecutar**.
Google va a pedir permiso la primera vez: **Revisar permisos › tu cuenta ›
Configuración avanzada › Ir a (nombre del proyecto) › Permitir**.

### 5. Vuelve a abrir la planilla

Ciérrala y ábrela de nuevo. Arriba aparece el menú **Casos** y las columnas
quedan llenas. De ahí en adelante se actualiza solo cada vez que se abre.

Si prefieres actualizarlas sin cerrar la planilla:
**Casos › Actualizar año / hoy / días**.

---

## Lo que se puede cambiar

Todo está arriba del archivo, en `CFG_CASOS`:

```js
var CFG_CASOS = {
  NOMBRE_HOJA: '',              // vacío = la primera hoja de la planilla
  COL_FECHA_APERTURA: 2,        // 2 = B
  COL_INICIO: 5,                // 5 = E, donde se insertan las tres columnas
  ENCABEZADOS: ['Año', 'Hoy', 'Días casos abiertos'],
  CLAVES: ['ano', 'hoy', 'dia'],
  FORMATO_FECHA: 'dd/mm/yyyy',
  USAR_FORMULAS: false,
  EJECUTAR_AL_ABRIR: true
};
```

- **`CLAVES`** es con qué empieza el encabezado para dar la columna por existente.
  Se compara en minúsculas y sin tildes, así que `año(llenarlo atravez de
  appscript on open)` cuenta como la columna `Año`. Las tres tienen que calzar
  seguidas para que el script las reconozca; si no, inserta columnas nuevas.
- **`USAR_FORMULAS: false`** escribe valores fijos, calculados en el momento:
  la columna *Hoy* y la de *días* siempre van a juego, y la hoja no se recalcula
  a cada rato. Ponlo en `true` si prefieres fórmulas vivas
  (`=AÑO(B2)`, `=HOY()`, `=HOY()-B2`); con muchas filas la hoja se pone más lenta,
  porque `HOY()` es volátil.
- **`EJECUTAR_AL_ABRIR: false`** deja el menú, pero no actualiza nada al abrir.

---

## Detalles que conviene saber

- La columna B se lee aunque tenga la fecha como texto (`26/12/2023`, `23/1/2024`,
  `2023-12-26`, `26/12/2023, 12:49`) o como número de serie de Sheets. Si la celda
  está vacía o no se entiende, *Año* y *Días* quedan en blanco y *Hoy* se escribe igual.
- **Días** es `hoy − fecha de apertura`, esté el caso cerrado o no. Sale negativo
  si la apertura es a futuro.
- Hasta dónde llega el relleno se decide mirando **solo las columnas que no son
  del script**. Si se contara la propia columna *Hoy*, la hoja se estiraría sola
  una corrida tras otra.
- Quien abra la planilla **solo como lector** no rompe nada: el menú aparece, la
  actualización falla en silencio y queda anotada en *Ejecuciones* del editor.
- `onOpen` es un activador simple: Google le da 30 segundos. Con el tamaño actual
  de la planilla sobra (es una sola lectura y una sola escritura), pero si algún
  día se queda corto, usa el menú o crea un activador instalable por tiempo.

---

## Pruebas

```
node casos/pruebas/test.js
```

Simulan la hoja real —con y sin las columnas— y comprueban que las columnas se
inserten corriendo el resto a la derecha, que el año y los días salgan de la
apertura y no del cierre, que la columna *Hoy* se reescriba entera (pisando
valores viejos y limpiando los restos de abajo), que correr el script dos veces
no duplique nada, y la cuenta de días: del 26/12/2023 al 02/09/2026 hay 981 días.
