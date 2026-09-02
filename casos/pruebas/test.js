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
let hoja = ss.insertSheet('Casos', [
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
ok(global.__menu.items.length === 1 && global.__menu.items[0][1] === 'actualizarCasos', 'onOpen deja el menú');

// ---------------------------------------------------------------------------
seccion('La hoja NO tiene las columnas: hay que insertarlas y correr el resto');

ss = nuevaPlanilla();
hoja = ss.insertSheet('Casos', [
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
hoja = ss.insertSheet('Casos', [
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
hoja = ss.insertSheet('Casos', [
  ['Número del caso', 'Fecha de apertura', 'Fecha de cierre', 'Propietario del caso'],
  ['1350', '26/12/2023', '26/12/2023', 'Matias Sumonte']
]);
actualizarCasos();
ok(hoja.getMaxColumns() === 7, 'agrega las columnas al final si la hoja llegaba solo hasta la D');
ok(fila(hoja, 1).slice(4, 7).join('|') === 'Año|Hoy|Días casos abiertos', 'encabezados en E, F y G');
ok(fila(hoja, 2)[4] === 2023 && fila(hoja, 2)[6] === diasHasta(26, 12, 2023), 'y los valores');

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

console.log(fallos ? '\n' + fallos + ' prueba(s) fallaron' : '\nTodo bien');
process.exit(fallos ? 1 : 0);
