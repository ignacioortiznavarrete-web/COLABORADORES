# registromaderas — Registro de requerimientos (PT · PCP · PP)

Apps Script sobre el spreadsheet **Maderas**
(`15THGajqCDH0YuBaoEUt9uLM8s-6iKsUf9_-vY8bABmE`).

Nadie escribe el código de material. Se elige la agrupación, se dictan las
medidas y el formulario arma el código, decide por qué etapas pasa el producto
y escribe la fila completa de batch input.

```
RVMH  +  032 X 180 X 3960   ->   RVMH032X180X3960
└──┬─┘   └─┬─┘   └┬┘   └─┬┘
prefijo  espesor ancho  largo
```

---

## Cómo está armado el código

Los cuatro caracteres del prefijo salen de la hoja *MAderas Trading Estructura*:

| Posición | Qué dice | Ejemplos |
|---|---|---|
| 1 | Elaboración | `C` Cepillado · `R` Rústico |
| 2 | Estado | `V` Verde · `S` Estufada · `2`/`3`/`4` caras · `B` CTS Bisel · `C` CTS |
| 3 | Calidad | `M` Médula · `J` COL B · `K` Primera · `N` Mill Run · `F` COL MIX … |
| 4 | Especie | `H` Radiata Terceros · `R` Radiata EERR · `« »` producto en proceso |

Después van espesor (3 dígitos), `X`, ancho (3) y, si el producto lo lleva, `X`
y largo (4). Con largo el código mide **16 caracteres**; sin largo, **11**. Los
ceros a la izquierda los pone el formulario: escribes `32` y queda `032`.

De las 41.816 filas de `BD_Maderas`, 40.066 siguen exactamente este patrón.

## Las condicionales

Todo lo que el formulario decide solo sale de tus propias hojas:

| Decisión | De dónde sale |
|---|---|
| Qué agrupaciones se pueden pedir | Hoja **SAP**: `Ce.` + `TpMt` → `AgrupMad` |
| Si hay etapa de **cepillado** | Carácter 1 del prefijo: solo si es `C` |
| Si hay etapa de **secado** | Carácter 2: no la hay si es `V` (verde) |
| Etapa de **aserradero** | Va siempre |
| Plantilla propuesta de cada etapa | Hoja **Agrupamiento**, por el carácter 3 (calidad) |
| Largos que se ofrecen | Los que `BD_Maderas` tiene para esa agrupación y escuadría |

Ejemplos, con los mismos códigos de tu archivo:

- `RVMH` → **R**ústico **V**erde: solo aserradero. Secado y cepillado quedan en blanco.
- `RSFR` → Rústico **S**eco: aserradero y secado.
- `C4JH` → **C**epillado: las tres etapas.

Qué habilita cada combinación, hoy:

| Centro | TpMt | Agrupaciones |
|---|---|---|
| TCD2 | TTAS | 9 (C4JH, C4KH, RSKH, RSMH, RSNH, RSWH, RSYH, RVBH, RVMH) |
| TCP1 | TTAS | 8 (C4JR, C4KR, RSFR, RSJR, RSKR, RSMR, RSOR, RSZR) |
| TCP1 | TPAS | 16 (las de proceso, de tres letras: CSF, RSF, RVM…) |
| TCD2 | TPAS | ninguna |

## Los cinco pasos

| Paso | Qué se pide |
|---|---|
| 1 · Cabecera | Clase (PT/PCP/PP), origen (Trading elige centro TCP1 o TCD2; Planta va fijo en TCP1) y tipo de material (TTAS/TPAS) |
| 2 · Agrupación | Solo las que el centro y el tipo de material habilitan |
| 3 · Medidas | Espesor, ancho y largo. Se ofrecen los largos que existen en la base |
| 4 · Desglose | Aserradero, secado y cepillado: propuestos, y editables si la etapa va sobredimensionada |
| 5 · Cantidad | Piezas, unidad y stock/pedido, con el resumen de la fila antes de guardar |

Arriba, siempre a la vista, el código se va armando carácter por carácter y
debajo dice qué significa cada uno.

## Lo que se completa solo

| Dato | Valor |
|---|---|
| País | `CL` |
| Tipo Requerimiento | `NO` |
| Clase Requerimiento | la del paso 1 |
| Llegada requerimiento | la fecha de hoy, como texto `dd.mm.aaaa` |
| Usuario Solicitante | correo de quien está usando el formulario |

## La fila que se escribe

En la hoja de la clase (`PT`, `PCP` o `PP`), desde la fila 3 porque los rótulos
están en la fila 2:

| Col | Rótulo | Qué recibe |
|---|---|---|
| A–F | País … Usuario Solicitante | lo automático de arriba |
| G–J | Aserradero(Template), Tamaño Dimensión, EE, AA | etapa de aserradero |
| K–N | Secado(Template), Tamaño dimensión, EE, AA | etapa de secado (vacías si no aplica) |
| O–R | Cepillado(Template), Tamaño dimensión, EE, AA | etapa de cepillado (vacías si no aplica) |
| S | Empaquetado | la agrupación elegida |
| T–W | Tamaño dimensión, Espesor, Ancho, Largo | la medida final |
| X–Z | PAK, UMB, Stock/Pedido | piezas, unidad y origen |

`EE` y `AA` se calculan igual que los `MID()` de tu hoja Entrada, pero se
escriben como valor: una fila de batch input no debería depender de fórmulas.

`Descripcion Especial EN/ES` y los rendimientos **no se tocan**.

Además, cada solicitud deja una línea en la hoja `Registro`, con `Hoja Destino`
y `Fila Destino` para poder ir de la bitácora a la fila original.

---

## Cómo se instala

Cinco pasos, una sola vez. Son siete archivos, los de la carpeta `fuente/`.

### 1. Abre el editor

En el spreadsheet **Maderas**: **Extensiones › Apps Script**.

### 2. Crea los siete archivos

Con el **+** de la lista de archivos: *Secuencia de comandos* para los `.gs` y
*HTML* para los `.html`. Al crearlos escribe el nombre sin la extensión (Apps
Script se la pone solo). En cada uno pega el contenido del archivo de esta
carpeta:

| Archivo en Apps Script | Contenido |
|---|---|
| `Config.gs` | `fuente/Config.gs` |
| `Catalogos.gs` | `fuente/Catalogos.gs` |
| `Registro.gs` | `fuente/Registro.gs` |
| `Setup.gs` | `fuente/Setup.gs` |
| `WebApp.gs` | `fuente/WebApp.gs` |
| `Estilos.html` | `fuente/Estilos.html` |
| `Formulario.html` | `fuente/Formulario.html` |

Borra el `Código.gs` que viene por defecto con su `function myFunction() {}`.
Guarda con `Ctrl+S`.

Los nombres `Estilos` y `Formulario` tienen que quedar tal cual: el código los
llama por ese nombre. Los `.gs` pueden llamarse como quieras y el orden no
importa, porque en Apps Script todos comparten el mismo espacio.

### 3. Prepara las hojas

En el selector de funciones elige **`instalarRegistro`** y pulsa **Ejecutar**.

Google pedirá permisos: *Revisar permisos › elige tu cuenta › Configuración
avanzada › Ir a (nombre del proyecto) › Permitir*. La pantalla de "app no
verificada" es normal en scripts propios.

Eso crea las hojas **SAP** y **Agrupamiento** con los catálogos del archivo de
Jorge, deja `Registro` con sus encabezados y avisa si alguna columna de
PT/PCP/PP se movió de lugar.

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

Copia la URL y mándala. Con `?clase=PT`, `?clase=PCP` o `?clase=PP` al final se
entra con la clase ya elegida. El menú **Registro Maderas › Ver enlace del
formulario** te los muestra armados.

---

## Mantener los catálogos

**Se editan en Sheets, no en el código.** Las hojas `SAP` y `Agrupamiento` son
la fuente de verdad: agregar una agrupación nueva es pegar una fila en `SAP` con
su `Ce.`, `TpMt` y `AgrupMad`, y aparece en el formulario. Lo mismo con las
plantillas de etapa en `Agrupamiento`.

Los catálogos se recuerdan seis horas para no releer la planilla en cada clic.
Si acabas de cambiarlos y quieres verlos ya, ejecuta `instalarRegistro`.

## Decisiones que conviene revisar

**Las plantillas de etapa se proponen por la calidad.** `RVMH` tiene calidad `M`,
así que propone `RVM` para aserradero y `RSM` para secado, que son los códigos
que están en tu hoja Agrupamiento. En tu archivo de ejemplo aparecían `RVFD` y
`RSFD`, que no están en ese catálogo: si la plantilla correcta lleva la especie
pegada, agrégala como fila en `Agrupamiento` y quedará disponible.

**El código tiene que existir en `BD_Maderas`.** Si la combinación no está, no se
guarda y el formulario ofrece los largos que sí existen. Para permitir códigos
nuevos, `MEDIDAS.EXIGIR_EN_BD = false` en `Config.gs`.

**Los códigos con espacios raros igual se encuentran.** Hay 15 filas en
`BD_Maderas` con un espacio duro pegado al final (`RSFR037X130X3600 `). El
formulario los reconoce y guarda el código limpio.

**El solicitante es el correo, no el nombre.** En tu ejemplo decía
"Babara Riquelme"; acá queda `barbara.riquelme@…` porque es lo que Google
entrega de forma confiable y no se puede escribir a mano.

**La fecha va como texto.** `21.07.2026`, no como fecha de Sheets, para que el
batch input salga tal cual.

## Quién puede entrar

Por defecto entra cualquiera con el enlace (dentro del dominio). Para limitarlo,
pon los correos en `ACCESOS` (`Config.gs`):

```js
const ACCESOS = ['ana@empresa.com', 'beto@empresa.com'];
```

El permiso se revisa **también al guardar**, no solo al abrir la página.

---

## Para desarrollar (opcional)

Los archivos de `fuente/` son exactamente los que van al editor: acá no se
genera ni se compila nada. Si editas en el editor de Apps Script, copia el
cambio de vuelta para que el repositorio siga siendo el respaldo.

| Archivo | Qué hay |
|---|---|
| `fuente/Config.gs` | Clases, orígenes, centros, nomenclatura, mapeo de columnas, `ACCESOS`. |
| `fuente/Catalogos.gs` | Lectura de las hojas SAP y Agrupamiento, con sus semillas. |
| `fuente/Registro.gs` | Armado del código, etapas aplicables, búsqueda y escritura. La API. |
| `fuente/Setup.gs` | Crea las hojas de catálogo y revisa las columnas. Menú. |
| `fuente/WebApp.gs` | Entrega el formulario. |
| `fuente/Estilos.html` | El sistema visual. |
| `fuente/Formulario.html` | Los cinco pasos y el código en vivo. |
| `pruebas/` | Simulador de Apps Script + pruebas. |

```bash
cd registromaderas/pruebas && node test.js
```

Las pruebas levantan las hojas con los mismos encabezados que tiene hoy el
spreadsheet (rótulos repetidos incluidos) y cubren las condicionales: qué
agrupación habilita cada centro, qué etapas aplican según el prefijo, cómo se
arma el código y qué queda escrito en cada columna.
