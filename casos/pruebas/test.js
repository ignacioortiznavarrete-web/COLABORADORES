/**
 * Pruebas de casos/Codigo.gs:  node casos/pruebas/test.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { nuevaPlanilla } = require('./mock');

const FUENTE = path.join(__dirname, '..', 'Codigo.gs');
vm.runInThisContext(fs.readFileSync(FUENTE, 'utf8'), { filename: 'Codigo.gs' });

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }

const ahora = new Date();
const HOY = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

/** Días hasta hoy, calculado aparte (en UTC) para no depender del código probado. */
function diasHasta(dia, mes, anio) {
  const desde = Date.UTC(anio, mes - 1, dia);
  const hasta = Date.UTC(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  return Math.round((hasta - desde) / 86400000);
}

const esHoy = v => v instanceof Date && v.getTime() === HOY.getTime();
const fila = (hoja, r) => hoja.getRange(r, 1, 1, hoja.getMaxColumns()).getValues()[0];

// ---------------------------------------------------------------------------
seccion('La hoja ya trae los encabezados (como está hoy la Planilla Yasna)');

let ss = nuevaPlanilla();
let hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso',
    'año(llenarlo atravez de appscript on open)',
    'hoy(se llena atravez del on open app script)',
    'dias casos abiertos(se calcula atravez de on open app script )',
    'Nombre de la cuenta', 'Asunto'],
  // La fila 2 trae basura de una corrida vieja: tiene que quedar reescrita.
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte', 1999, new Date(2020, 0, 1), 7, 'Mexichem Costa Rica', 'Cerrado'],
  // Abierta en 2023 y cerrada en 2024: el año y los días salen de la APERTURA.
  ['1224', '30/12/2023', '23/1/2024', 'Matias Sumonte', '', '', '', 'EAST COAST MILLWORK', 'Cerrado'],
  ['1999', '', '', 'Matias Sumonte', '', '', '', 'Caso sin fecha', 'Abierto']
]);

onOpen();

ok(hoja.getMaxColumns() === 9, 'no inserta columnas: las que había ya servían (9 columnas)');
ok(fila(hoja, 1)[4] === 'Año' && fila(hoja, 1)[5] === 'Hoy' && fila(hoja, 1)[6] === 'Días casos abiertos',
  'deja los encabezados limpios en E, F y G');
ok(fila(hoja, 1)[7] === 'Nombre de la cuenta', 'no toca la columna H');
ok(fila(hoja, 2)[4] === 2023, 'E2 = año de la fecha de apertura (2023)');
ok(fila(hoja, 2)[6] === diasHasta(26, 12, 2023), 'G2 = días entre la apertura y hoy');
ok(fila(hoja, 3)[4] === 2023, 'E3 = 2023, el año de la apertura (30/12/2023), no el del cierre (2024)');
ok(fila(hoja, 3)[6] === diasHasta(30, 12, 2023), 'G3 cuenta desde la apertura, no desde el cierre');
ok([2, 3, 4].every(r => esHoy(fila(hoja, r)[5])),
  'la columna Hoy queda completa: pisa el valor viejo y llena las filas vacías');
ok(fila(hoja, 4)[4] === '' && fila(hoja, 4)[6] === '',
  'sin fecha de apertura: año y días quedan vacíos, pero Hoy igual se escribe');
ok(hoja.formatos['2,5'] === '0' && hoja.formatos['2,6'] === 'dd/mm/yyyy',
  'aplica formato: año sin separador de miles, hoy como fecha');
ok(global.__menu.items.map(function (i) { return i[1]; }).join(',') === 'abrirTablero,actualizarCasos',
  'onOpen deja el menú con el tablero y la actualización');

// ---------------------------------------------------------------------------
seccion('La hoja NO tiene las columnas: hay que insertarlas y correr el resto');

ss = nuevaPlanilla();
hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso', 'Nombre de la cuenta', 'Asunto'],
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte', 'Mexichem Costa Rica', 'Cerrado'],
  ['1224', '30/12/2023', '23/1/2024', 'Matias Sumonte', 'EAST COAST MILLWORK', 'Cerrado']
]);

actualizarCasos();

ok(hoja.getMaxColumns() === 9, 'inserta 3 columnas (6 -> 9)');
ok(fila(hoja, 1).slice(0, 4).join('|') === 'Número del caso|Fecha de apertura|Fecha de cierre|Propietario del caso',
  'A-D quedan donde estaban');
ok(fila(hoja, 1).slice(4, 7).join('|') === 'Año|Hoy|Días casos abiertos', 'E, F y G son las nuevas');
ok(fila(hoja, 1)[7] === 'Nombre de la cuenta' && fila(hoja, 1)[8] === 'Asunto',
  'lo que estaba en E y F se corrió a H e I');
ok(fila(hoja, 2)[7] === 'Mexichem Costa Rica', 'los datos de las filas también se corrieron');
ok(fila(hoja, 2)[4] === 2023 && fila(hoja, 2)[6] === diasHasta(26, 12, 2023), 'llena la fila 2');
ok(fila(hoja, 3)[4] === 2023 && fila(hoja, 3)[6] === diasHasta(30, 12, 2023),
  'llena la fila 3 leyendo la columna B, que se corrió junto con el resto');

seccion('Correrlo de nuevo no duplica nada');
actualizarCasos();
actualizarCasos();
ok(hoja.getMaxColumns() === 9, 'sigue con 9 columnas después de tres ejecuciones');
ok(fila(hoja, 2)[7] === 'Mexichem Costa Rica' && fila(hoja, 2)[4] === 2023, 'los valores no se corren ni se pierden');

// ---------------------------------------------------------------------------
seccion('Restos de una corrida anterior debajo de los casos');

ss = nuevaPlanilla();
hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario', 'Año', 'Hoy', 'Días casos abiertos', 'Asunto'],
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte', 2023, new Date(2020, 0, 1), 7, 'Cerrado'],
  ['', '', '', '', 2023, new Date(2020, 0, 1), 7, ''],
  ['', '', '', '', 2023, new Date(2020, 0, 1), 7, '']
]);

const filasLlenas = actualizarCasos();

ok(filasLlenas === 1, 'cuenta una sola fila de casos: las de abajo solo tenían lo que dejó el script');
ok(fila(hoja, 2)[4] === 2023 && esHoy(fila(hoja, 2)[5]), 'la fila con datos queda actualizada');
ok(fila(hoja, 3).slice(4, 7).join('') === '' && fila(hoja, 4).slice(4, 7).join('') === '',
  'las de más abajo quedan limpias, la columna Hoy no se estira sola');

// ---------------------------------------------------------------------------
seccion('Hojas más angostas que la columna E');

ss = nuevaPlanilla();
hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso'],
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte']
]);
actualizarCasos();
ok(hoja.getMaxColumns() === 7, 'agrega las columnas al final si la hoja llegaba solo hasta la D');
ok(fila(hoja, 1).slice(4, 7).join('|') === 'Año|Hoy|Días casos abiertos', 'encabezados en E, F y G');
ok(fila(hoja, 2)[4] === 2023 && fila(hoja, 2)[6] === diasHasta(26, 12, 2023), 'y los valores');

// ---------------------------------------------------------------------------
seccion('Elige la hoja por su nombre (BD)');

ss = nuevaPlanilla();
const otra = ss.insertSheet('Resumen', [['no me toques']]);
hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso', 'Asunto'],
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte', 'Cerrado']
]);
actualizarCasos();

ok(fila(hoja, 1).slice(4, 7).join('|') === 'Año|Hoy|Días casos abiertos',
  'trabaja sobre BD aunque no sea la primera hoja de la planilla');
ok(fila(hoja, 2)[4] === 2023 && esHoy(fila(hoja, 2)[5]), 'y la llena');
ok(otra.getMaxColumns() === 1 && fila(otra, 1)[0] === 'no me toques', 'no toca las otras hojas');

ss = nuevaPlanilla();
ss.insertSheet('Otro nombre', [['Número del caso']]);
let error = '';
try { actualizarCasos(); } catch (e) { error = String(e.message || e); }
ok(error.indexOf('BD') !== -1, 'si le cambian el nombre a la hoja, avisa cuál falta: ' + error);

// ---------------------------------------------------------------------------
seccion('Formatos de fecha que puede tener la columna B');

ok(aFecha_(new Date(2023, 11, 26, 12, 49)).getTime() === new Date(2023, 11, 26).getTime(),
  'fecha de verdad: se le quita la hora');
ok(aFecha_('26/12/2023').getTime() === new Date(2023, 11, 26).getTime(), 'texto 26/12/2023');
ok(aFecha_('23/1/2024').getTime() === new Date(2024, 0, 23).getTime(), 'texto 23/1/2024');
ok(aFecha_('2023-12-26').getTime() === new Date(2023, 11, 26).getTime(), 'texto 2023-12-26');
ok(aFecha_('26/12/2023, 12:49').getTime() === new Date(2023, 11, 26).getTime(), 'texto con hora');
ok(aFecha_(45286).getTime() === new Date(2023, 11, 26).getTime(), 'número de serie de Sheets');
ok(aFecha_('') === null && aFecha_(null) === null && aFecha_('   ') === null, 'celda vacía');
ok(aFecha_('pendiente') === null && aFecha_('31/02/2024') === null, 'texto que no es fecha');

seccion('Cuenta de días');
ok(diasEntre_(aFecha_('26/12/2023'), aFecha_('02/09/2026')) === 981, 'del 26/12/2023 al 02/09/2026 hay 981 días');
ok(diasEntre_(aFecha_('26/12/2023'), aFecha_('26/12/2023')) === 0, 'mismo día: 0');
ok(diasEntre_(aFecha_('01/03/2024'), aFecha_('01/01/2024')) === -60, 'apertura a futuro: negativo');

// ---------------------------------------------------------------------------
seccion('Datos que el tablero recibe de la hoja');

ss = nuevaPlanilla();
hoja = ss.insertSheet('BD', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso',
    'año(llenarlo atravez de appscript on open)', 'hoy', 'dias casos abiertos',
    'Nombre de la cuenta', 'Asunto', 'Estado', 'Origen del caso', 'Abierto', 'Cerrado',
    'Tipo', 'Subcategoría', 'Requerimiento del Cliente', 'Causa Comercial', 'Estado caso'],
  ['2627', '7/1/2025', '22/1/2025', 'Yasna Esparza', '', '', '', 'Shinnihon Seikan',
    'Hongos blancos', 'Cerrado', 'Interno', 'FALSO', 'VERDADERO',
    'Exportaciones', 'Producto', 'Emisión NC por valor', '', 'Cerrados'],
  ['3854', new Date(2025, 11, 29), '', 'En aprobación', '', '', '', '',
    'Sin cerrar', 'Pendiente aprobación', 'Interno', true, false,
    'Mercado local', 'Comercial', 'Emisión NC por valor', 'Error de precio', 'Abiertos'],
  ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
]);

const mapa = mapaDeColumnas_(hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]);
ok(mapa.est === 9, 'la columna "Estado" gana por nombre exacto, no se la lleva "Estado caso"');
ok(mapa.ap === 1 && mapa.ci === 2, 'ubica las dos fechas');
ok(mapa.cer === 12, '"Cerrado" es la columna P: no se la lleva "Fecha de cierre" ni "Abierto"');
ok(mapa.tip === 13 && mapa.sub === 14, 'ubica Tipo (columna R) y Subcategoría');
ok(mapa.cau === 16, 'ubica causa comercial');

const paquete = datosDelTablero_();
ok(paquete.hoja === 'BD' && /^\d{4}-\d{2}-\d{2}$/.test(paquete.hoy), 'devuelve la hoja y el día de hoy en ISO');
ok(paquete.casos.length === 2, 'descarta la fila vacía del final');
ok(paquete.casos[0].ap === '2025-01-07' && paquete.casos[0].ci === '2025-01-22',
  'convierte las fechas de texto a ISO');
ok(paquete.casos[1].ap === '2025-12-29' && paquete.casos[1].ci === '',
  'una fecha de verdad también sale en ISO; sin cierre queda vacío');
ok(paquete.casos[1].cau === 'Error de precio' && paquete.casos[1].cli === '',
  'trae la causa comercial y no inventa cliente cuando falta');
ok(paquete.casos[0].est === 'Cerrado', 'el estado que llega es el de la columna Estado');
ok(paquete.casos[0].cer === 'si' && paquete.casos[1].cer === 'no',
  'VERDADERO/FALSO en texto y como casilla real llegan igual: si / no');
ok(paquete.casos[0].tip === 'Exportaciones' && paquete.casos[1].tip === 'Mercado local',
  'el tipo viaja para poder filtrar por él');
ok(siONo_('Verdadero') === 'si' && siONo_(false) === 'no' && siONo_('') === '' && siONo_('quizás') === '',
  'la casilla se lee en texto, en booleano, y no inventa cuando viene rara');

// ---------------------------------------------------------------------------
seccion('Cambiar un caso a cerrado o abierto desde el tablero');

/** Arma una hoja con las columnas Abierto y Cerrado escritas de una forma dada. */
function hojaEditable(abierto1, cerrado1, cierre1) {
  const planilla = nuevaPlanilla();
  const h = planilla.insertSheet('BD', [
    ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Estado', 'Abierto', 'Cerrado'],
    ['2627', '7/1/2025', cierre1, 'Cerrado', abierto1, cerrado1],
    ['4011', '8/4/2026', '', 'SNC Autorizada', !abierto1, !cerrado1]
  ]);
  return h;
}
const celda = (h, f, c) => h.getRange(f, c).getValue();

let hj = hojaEditable(false, true, new Date(2025, 0, 22));
let res = cambiarEstadoCaso('4011', true);
ok(celda(hj, 3, 5) === false && celda(hj, 3, 6) === true,
  'con casillas de verificación escribe booleanos: Abierto false, Cerrado true');
ok(celda(hj, 3, 3) instanceof Date, 'y la fecha de cierre queda como fecha, igual que sus vecinas');
ok(res.cerrado === true && /^\d{4}-\d{2}-\d{2}$/.test(res.ci), 'devuelve al tablero lo que quedó escrito');

hj = hojaEditable('FALSO', 'VERDADERO', '22/1/2025');
cambiarEstadoCaso('4011', true);
ok(celda(hj, 3, 5) === 'FALSO' && celda(hj, 3, 6) === 'VERDADERO',
  'donde la columna es texto en español, escribe VERDADERO y FALSO, no booleanos');
ok(celda(hj, 3, 3) === HOY.getDate() + '/' + (HOY.getMonth() + 1) + '/' + HOY.getFullYear(),
  'y la fecha con el mismo formato de texto de la columna (d/M/yyyy)');

hj = hojaEditable('FALSE', 'TRUE', '2025-01-22');
cambiarEstadoCaso('4011', true);
ok(celda(hj, 3, 5) === 'FALSE' && celda(hj, 3, 6) === 'TRUE', 'y en inglés, TRUE/FALSE');
ok(celda(hj, 3, 3) === HOY.getFullYear() + '-' + String(HOY.getMonth() + 1).padStart(2, '0') + '-' + String(HOY.getDate()).padStart(2, '0'),
  'con la fecha en ISO si así está la columna');

hj = hojaEditable(false, true, new Date(2025, 0, 22));
res = cambiarEstadoCaso('2627', false);
ok(celda(hj, 2, 5) === true && celda(hj, 2, 6) === false, 'reabrir invierte las dos columnas');
ok(celda(hj, 2, 3) === '' && res.ci === '', 'y borra la fecha de cierre: un caso abierto no tiene cierre');

hj = hojaEditable(false, true, '');
let falla = '';
try { cambiarEstadoCaso('9999', true); } catch (e) { falla = String(e.message || e); }
ok(falla.indexOf('9999') !== -1, 'un caso que no está en la hoja da un error que lo nombra: ' + falla);

CFG_CASOS.PERMITIR_EDICION = false;
falla = '';
try { cambiarEstadoCaso('4011', true); } catch (e) { falla = String(e.message || e); }
ok(falla.toLowerCase().indexOf('desactivada') !== -1, 'con PERMITIR_EDICION en false, el servidor no escribe');
CFG_CASOS.PERMITIR_EDICION = true;

console.log(fallos ? '\n' + fallos + ' prueba(s) fallaron' : '\nTodo bien');
process.exit(fallos ? 1 : 0);
