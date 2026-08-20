/**
 * Comprobaciones sobre Codigo.gs, con las globales de Apps Script
 * simuladas. No toca Gmail ni el spreadsheet.
 *
 *   cd astilla/pruebas && node prueba.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const codigo = fs.readFileSync(
  path.join(__dirname, '..', 'Codigo.gs'),
  'utf8'
);

function pad(n) { return String(n).padStart(2, '0'); }

const sandbox = {
  console: console,
  Utilities: {
    formatDate: function(date, tz, fmt) {
      const y = date.getUTCFullYear();
      const m = pad(date.getUTCMonth() + 1);
      const d = pad(date.getUTCDate());
      if (fmt === 'yyyy-MM') { return y + '-' + m; }
      return y + '-' + m + '-' + d;
    },
    getUuid: function() { return 'uuid'; }
  }
};

vm.createContext(sandbox);

// Los `const` de nivel superior viven en el ámbito léxico del script,
// no en el objeto del contexto, así que hay que exponerlos a mano.
vm.runInContext(
  codigo +
  '\n;globalThis.K = {' +
  '  CONFIG, SUBPRODUCTOS_OBJETIVO, ESTADOS_MAPEO,' +
  '  ESTADO_INICIAL, ESTADO_CERRADO, MAPEOS_HEADERS, LIMITES_CL,' +
  '  RUTA_CONFIG, RUTAS_HEADERS' +
  '};',
  sandbox
);

const K = sandbox.K;

let fallos = 0;

function check(nombre, condicion, detalle) {
  if (condicion) {
    console.log('  ok   ' + nombre);
  } else {
    fallos++;
    console.log('  FALLA ' + nombre + (detalle ? ' → ' + detalle : ''));
  }
}

/* =====================================================================
 * 1. La planilla sin fecha no se da por buena
 *
 * Si se aceptara, se escribiría con Estado OK y fechas en blanco,
 * readInformeRows_ la descartaría en silencio y, al quedar el
 * messageId registrado, no se reintentaría nunca.
 * ===================================================================== */

console.log('\n1. Fecha faltante en la planilla');

const filas = [{
  subproducto: 'ASTILLA PINO VERDE',
  subproductoRaw: 'ASTILLA PINO VERDE',
  proveedor: 'PROMASA S.A.',
  destino: 'TABLEROS',
  camiones: 6
}];

let mensaje = '';

try {
  sandbox.buildParsedReport_('', filas, 'Tabla HTML del correo');
} catch (e) {
  mensaje = e.message;
}

check('lanza error si no hay fecha', mensaje !== '');
check('el mensaje dice cuántas filas se leyeron',
  mensaje.indexOf('1 filas') !== -1, mensaje);
check('con fecha válida devuelve el informe',
  sandbox.buildParsedReport_('2026-08-14', filas, 'Tabla HTML')
    .fecha === '2026-08-14');

/* =====================================================================
 * 2. Solo entra la planilla oficial del reservador
 * ===================================================================== */

console.log('\n2. Filtro de correo');

function asunto(texto, remitente) {
  return sandbox.matchesPlanillaMessage_({
    getSubject: function() { return texto; },
    getFrom: function() {
      return remitente || 'Reservador <reservador.horario@masisa.com>';
    }
  });
}

check('acepta el asunto oficial',
  asunto('PLANILLA CUMPLIMIENTO SUB-PRODUCTOS VIERNES 14 DE AGOSTO DE 2026'));

check('acepta sin guion en SUB PRODUCTOS',
  asunto('PLANILLA CUMPLIMIENTO SUB PRODUCTOS VIERNES 14 DE AGOSTO DE 2026'));

check('rechaza una respuesta del hilo',
  !asunto('RE: PLANILLA CUMPLIMIENTO SUB-PRODUCTOS VIERNES 14 DE AGOSTO DE 2026'));

check('rechaza un reenvío',
  !asunto('RV: PLANILLA CUMPLIMIENTO SUB-PRODUCTOS VIERNES 14 DE AGOSTO DE 2026'));

check('rechaza texto agregado al final',
  !asunto('PLANILLA CUMPLIMIENTO SUB-PRODUCTOS VIERNES 14 DE AGOSTO DE 2026 (corregida)'));

check('rechaza a otro remitente',
  !asunto('PLANILLA CUMPLIMIENTO SUB-PRODUCTOS VIERNES 14 DE AGOSTO DE 2026',
          'Otro <otro@masisa.com>'));

/* =====================================================================
 * 3. Feriados en el prorrateo
 * ===================================================================== */

console.log('\n3. Días hábiles de septiembre 2026');

const wd = sandbox.buildWorkdaysInfo_(
  'America/Santiago',
  {
    prefix: '2026-09', year: 2026, month: 9,
    startKey: '2026-09-01', endKey: '2026-09-30',
    label: 'septiembre de 2026'
  },
  '2026-09-30',
  ''
);

// 22 días de lunes a viernes; el 18 y el 21 son feriados (el 19 cae
// sábado, así que no descuenta).
check('días hábiles = 20', wd.total === 20, 'total=' + wd.total);
check('el 18-09 no es hábil', wd.workdayKeys.indexOf('2026-09-18') === -1);
check('el 21-09 no es hábil', wd.workdayKeys.indexOf('2026-09-21') === -1);
check('el 17-09 sí es hábil', wd.workdayKeys.indexOf('2026-09-17') !== -1);

/* =====================================================================
 * 4. El complemento: Ingresos manda
 * ===================================================================== */

console.log('\n4. Regla de complemento');

const planilla = [
  { fecha: '2026-08-10', camiones: 4 },
  { fecha: '2026-08-11', camiones: 6 },
  { fecha: '2026-08-12', camiones: 5 }
];

const sinReal = sandbox.buildSupplementRows_([], planilla);
check('sin datos reales arranca en la planilla más antigua',
  sinReal.supplementStart === '2026-08-10', sinReal.supplementStart);

const conReal = sandbox.buildSupplementRows_(
  [{ fecha: '2026-08-10' }], planilla
);

check('con real hasta el 10, complementa desde el 11',
  conReal.supplementStart === '2026-08-11', conReal.supplementStart);
check('descarta el día ya presente en Ingresos',
  conReal.rows.length === 2 && conReal.staleReports === 1,
  'filas=' + conReal.rows.length + ' stale=' + conReal.staleReports);
check('suma los camiones complementados',
  conReal.camiones === 11, String(conReal.camiones));

/* =====================================================================
 * 5. Homologación de material
 * ===================================================================== */

console.log('\n5. Los tres materiales de proceso');

function porCodigo(codigo) {
  return sandbox.resolveIngresosSubproducto_(codigo, '', '').subproducto;
}

check('3000039 → pino verde',
  porCodigo(3000039) === 'ASTILLA PINO VERDE', porCodigo(3000039));
check('3009002 → pino verde c/corteza',
  porCodigo(3009002) === 'AST. PINO VERDE C/ CORTEZA', porCodigo(3009002));
check('3009003 → nitens',
  porCodigo(3009003) === 'ASTILLA EUCALYPTUS NITENS', porCodigo(3009003));
check('el código llega como texto igual',
  porCodigo('3009003') === 'ASTILLA EUCALYPTUS NITENS');
check('un material ajeno se ignora', porCodigo(3001111) === '');

console.log('\n   Por descripción, cuando no hay código conocido');

function porTexto(desc, pos) {
  return sandbox.resolveIngresosSubproducto_('', desc, pos || '').subproducto;
}

check('"ASTILLA VERDE CON CORTEZA" → c/corteza',
  porTexto('ASTILLA VERDE CON CORTEZA') === 'AST. PINO VERDE C/ CORTEZA');
check('"ASTILLA VERDE" → pino verde',
  porTexto('ASTILLA VERDE') === 'ASTILLA PINO VERDE');
check('"OTRA ESPECIE" → nitens',
  porTexto('ASTILLA OTRA ESPECIE') === 'ASTILLA EUCALYPTUS NITENS');
check('aserrín se ignora', porTexto('ASERRIN PINO') === '');

console.log('\n   canonicalSubproducto_, para la planilla del correo');

[
  ['ASTILLA EUCALYPTUS NITENS', 'ASTILLA EUCALYPTUS NITENS'],
  ['Astilla Eucaliptus Nitens', 'ASTILLA EUCALYPTUS NITENS'],
  ['AST. PINO VERDE C/ CORTEZA', 'AST. PINO VERDE C/ CORTEZA'],
  ['ASTILLA PINO VERDE CON CORTEZA', 'AST. PINO VERDE C/ CORTEZA'],
  ['ASTILLA PINO VERDE S/CORTEZA', 'ASTILLA PINO VERDE'],
  ['ASTILLA PINO VERDE', 'ASTILLA PINO VERDE'],
  ['ASTILLA PINO COMBUSTIBLE', ''],
  ['ASERRIN', ''],
  ['Total general', '']
].forEach(function(par) {
  const salida = sandbox.canonicalSubproducto_(par[0]);
  check('"' + par[0] + '" → ' + (par[1] || '(ignorado)'),
    salida === par[1], 'devolvió "' + salida + '"');
});

/* =====================================================================
 * 6. Cruce de precio: la ambigüedad no se adivina
 * ===================================================================== */

console.log('\n6. Homologación de precio');

const detalles = [
  {
    planKey: 'ASTILLA PINO VERDE||PROMASA', subproducto: 'ASTILLA PINO VERDE',
    proveedorPlan: 'PROMASA SPA.', proveedorPlanKey: 'PROMASA',
    precio: 92000, plan: 500
  },
  {
    planKey: 'ASTILLA PINO VERDE||FORESTAL LEON',
    subproducto: 'ASTILLA PINO VERDE',
    proveedorPlan: 'FORESTAL LEON LTDA', proveedorPlanKey: 'FORESTAL LEON',
    precio: 95000, plan: 900
  }
];

function precio(nombre) {
  return sandbox.resolvePlanPrice_(nombre, 'ASTILLA PINO VERDE', detalles);
}

check('cruza "PROMASA SPA."',
  precio('PROMASA SPA.').detail &&
  precio('PROMASA SPA.').detail.precio === 92000);

check('cruza con razón social distinta',
  precio('PROMASA S.A.').detail &&
  precio('PROMASA S.A.').detail.precio === 92000,
  precio('PROMASA S.A.').method);

check('un proveedor sin par no recibe precio',
  precio('ASERRADEROS SAN JOAQUIN S A').detail === null,
  precio('ASERRADEROS SAN JOAQUIN S A').method);

check('sin proveedor no inventa precio',
  precio('SIN PROVEEDOR').detail === null);

check('un material sin precio cargado no cruza',
  sandbox.resolvePlanPrice_('PROMASA SPA.', 'ASTILLA EUCALYPTUS NITENS',
    detalles).detail === null);

/* =====================================================================
 * 7. Mapeos: "Cerrado" exige cargas
 * ===================================================================== */

console.log('\n7. Mapeos: el estado es el motivo');

function guardarFalla(payload) {
  try { sandbox.guardarMapeo(payload); return ''; }
  catch (e) { return e.message; }
}

check('rechaza Cerrado sin cargas',
  guardarFalla({ id: 'MAP-0001', estado: 'Cerrado' })
    .indexOf('cuántas cargas') !== -1);
check('rechaza Cerrado con cero cargas',
  guardarFalla({ id: 'MAP-0001', estado: 'Cerrado', cargas: 0 })
    .indexOf('cuántas cargas') !== -1);
check('rechaza Cerrado con cargas negativas',
  guardarFalla({ id: 'MAP-0001', estado: 'Cerrado', cargas: -3 })
    .indexOf('cuántas cargas') !== -1);
check('rechaza un estado inventado',
  guardarFalla({ id: 'MAP-0001', estado: 'Tal vez' })
    .indexOf('Estado desconocido') !== -1);
check('rechaza una fila sin id',
  guardarFalla({ estado: 'Cerrado', cargas: 4 })
    .indexOf('identificador') !== -1);
check('Cerrado con 4 cargas supera la validación',
  guardarFalla({ id: 'MAP-0001', estado: 'Cerrado', cargas: 4 })
    .indexOf('cargas') === -1);
check('un estado de no-cierre no pide cargas',
  guardarFalla({ id: 'MAP-0001', estado: 'Sin stock' })
    .indexOf('cargas') === -1);
check('el estado inicial es "Por visitar"',
  K.ESTADO_INICIAL === 'Por visitar');
check('solo "Cerrado" cierra',
  K.ESTADOS_MAPEO.filter(function(e) { return e.cierra; })
    .map(function(e) { return e.nombre; }).join() === 'Cerrado');
check('los 7 estados tienen color propio',
  new Set(K.ESTADOS_MAPEO.map(function(e) { return e.color; })).size === 7);

/* =====================================================================
 * 8. Coordenadas pegadas
 * ===================================================================== */

console.log('\n8. parseCoordenadas_');

function coord(texto) {
  const r = sandbox.parseCoordenadas_(texto);
  if (!r) { return 'null'; }
  if (r.fuera) { return 'fuera'; }
  return r.lat.toFixed(4) + ',' + r.lng.toFixed(4) +
    (r.invertida ? ' (inv)' : '');
}

check('par decimal con coma y espacio',
  coord('-37.0331, -72.4015') === '-37.0331,-72.4015');
check('par decimal sin espacio',
  coord('-37.0331,-72.4015') === '-37.0331,-72.4015');
check('par separado por espacio',
  coord('-37.0331 -72.4015') === '-37.0331,-72.4015');
check('entre paréntesis',
  coord('(-37.0331, -72.4015)') === '-37.0331,-72.4015');
check('con espacios de sobra',
  coord('  -37.0331 ,  -72.4015  ') === '-37.0331,-72.4015');
check('coma decimal separada por espacio',
  coord('-37,0331 -72,4015') === '-37.0331,-72.4015');
check('grados minutos segundos',
  coord('37°01\'59.2"S 72°24\'05.4"W') === '-37.0331,-72.4015',
  coord('37°01\'59.2"S 72°24\'05.4"W'));

// El error clásico: pegar longitud primero. No falla, solo deja el pin
// en el Atlántico. Hay que detectarlo.
check('detecta y corrige lat/lng invertidas',
  coord('-72.4015, -37.0331') === '-37.0331,-72.4015 (inv)');

check('rechaza un punto fuera de Chile',
  coord('40.7128, -74.0060') === 'fuera');
check('rechaza texto que no es coordenada',
  coord('Camino a Nacimiento s/n') === 'null');
check('rechaza vacío', coord('') === 'null');
check('rechaza un solo número', coord('-37.0331') === 'null');
check('acepta Arica', coord('-18.4783, -70.3126') === '-18.4783,-70.3126');
check('acepta Punta Arenas',
  coord('-53.1638, -70.9171') === '-53.1638,-70.9171');
check('acepta la zona forestal',
  coord('-37.4690, -72.3530') === '-37.4690,-72.3530');

console.log('\n9. guardarUbicacion valida el punto');

function ubicaFalla(payload) {
  try { sandbox.guardarUbicacion(payload); return ''; }
  catch (e) { return e.message; }
}

check('rechaza sin id',
  ubicaFalla({ lat: -37, lng: -72 }).indexOf('identificador') !== -1);
check('rechaza coordenada no numérica',
  ubicaFalla({ id: 'MAP-0001', lat: 'x', lng: -72 })
    .indexOf('no es válida') !== -1);
check('rechaza un punto fuera de Chile',
  ubicaFalla({ id: 'MAP-0001', lat: 40.7, lng: -74 })
    .indexOf('fuera de Chile') !== -1);
check('un punto válido supera la validación',
  ubicaFalla({ id: 'MAP-0001', lat: -37.03, lng: -72.40 })
    .indexOf('Chile') === -1);

/* =====================================================================
 * 10. RUTAS: ESTIMACIÓN DE TIEMPO
 * ===================================================================== */

console.log('\n10. estimarRuta_');

// Aserraderos reales de la zona, con sus coordenadas.
const BIOCHIPER = { id: 'MAP-0001', nombre: 'BIOCHIPER', lat: -37.033, lng: -72.401 };
const PROMASA   = { id: 'MAP-0002', nombre: 'PROMASA',   lat: -37.279, lng: -72.712 };
const GEOMAR    = { id: 'MAP-0003', nombre: 'GEOMAR',    lat: -36.626, lng: -71.831 };
const CARFU     = { id: 'MAP-0005', nombre: 'WOOD CARFU', lat: -37.719, lng: -72.241 };
const AITUE     = { id: 'MAP-0008', nombre: 'AITUE',      lat: -36.740, lng: -72.995 };
const SIN_PUNTO = { id: 'MAP-0009', nombre: 'SIN UBICAR', lat: null, lng: null };

const unaParada = sandbox.estimarRuta_([BIOCHIPER], '08:30');

check('una parada da ida y vuelta (2 tramos)',
  unaParada.tramos.length === 2, String(unaParada.tramos.length));

check('el último tramo es el regreso',
  unaParada.tramos[1].nombre.indexOf('Regreso') === 0);

check('la visita suma 45 min',
  unaParada.minutosVisita === 45, String(unaParada.minutosVisita));

check('el total es viaje + visita',
  unaParada.minutosTotal === unaParada.minutosViaje + unaParada.minutosVisita);

const tres = sandbox.estimarRuta_([BIOCHIPER, PROMASA, GEOMAR], '08:30');

check('tres paradas dan cuatro tramos',
  tres.tramos.length === 4, String(tres.tramos.length));

check('tres visitas son 135 min',
  tres.minutosVisita === 135, String(tres.minutosVisita));

check('la llegada a un destino lejano es más tarde que la salida',
  sandbox.estimarRuta_([GEOMAR], '08:30').tramos[0].llegada > '08:30',
  sandbox.estimarRuta_([GEOMAR], '08:30').tramos[0].llegada);

// Biochiper está en Cabrero, prácticamente sobre el origen: llegar no
// toma tiempo y eso es correcto, no un error.
check('una parada pegada al origen llega a la hora de salida',
  tres.tramos[0].llegada === '08:30', tres.tramos[0].llegada);

check('cada parada llega después de la anterior',
  tres.tramos[0].llegada < tres.tramos[1].llegada &&
  tres.tramos[1].llegada < tres.tramos[2].llegada);

check('la salida es 45 min después de la llegada',
  sandbox.horaAMinutos_(tres.tramos[0].salida) -
  sandbox.horaAMinutos_(tres.tramos[0].llegada) === 45);

check('acumula kilómetros', tres.km > unaParada.km,
  tres.km + ' vs ' + unaParada.km);

// Biochiper está en Cabrero, prácticamente en el origen; Geomar en
// Coihueco, a ~85 km en línea recta. El factor de camino los infla.
check('la distancia es del orden correcto',
  tres.km > 150 && tres.km < 400, String(tres.km));

check('marca cuando no cabe en la jornada',
  sandbox.estimarRuta_(
    [BIOCHIPER, PROMASA, GEOMAR, PROMASA, GEOMAR, BIOCHIPER], '08:30'
  ).excedeJornada === true);

check('una ruta corta no excede la jornada',
  unaParada.excedeJornada === false);

// El orden de las paradas tiene que cambiar el recorrido de verdad.
// Elegir bien el caso cuesta más de lo que parece: invertir un circuito
// cerrado da exactamente los mismos kilómetros, y estas tres —Promasa,
// Cabrero y Geomar— están casi en línea recta, así que ahí cualquier
// orden empata por geometría y un empate no probaría nada. Carfu al
// sur, Aitue en la costa y Geomar al norte sí forman un triángulo
// abierto, y ahí el orden pesa.
const ordenMalo  = sandbox.estimarRuta_([AITUE, CARFU, GEOMAR], '08:30');
const ordenBueno = sandbox.estimarRuta_([CARFU, GEOMAR, AITUE], '08:30');

check('el orden de las paradas cambia el recorrido',
  ordenMalo.km > ordenBueno.km + 10,
  ordenMalo.km + ' vs ' + ordenBueno.km);

check('el desvío también alarga la duración',
  ordenMalo.minutosViaje > ordenBueno.minutosViaje,
  ordenMalo.minutosViaje + ' vs ' + ordenBueno.minutosViaje);

check('la visita no depende del orden',
  ordenBueno.minutosVisita === ordenMalo.minutosVisita);

console.log('\n   Paradas sin coordenada');

const conSinUbicar = sandbox.estimarRuta_([BIOCHIPER, SIN_PUNTO], '08:30');

check('las cuenta aparte en vez de romper',
  conSinUbicar.sinUbicar === 1, String(conSinUbicar.sinUbicar));

check('no las mete en el itinerario',
  conSinUbicar.tramos.length === 2, String(conSinUbicar.tramos.length));

check('sin ninguna coordenada devuelve vacío',
  sandbox.estimarRuta_([SIN_PUNTO], '08:30').tramos.length === 0);

console.log('\n11. Horas y duraciones');

check('08:30 son 510 min', sandbox.horaAMinutos_('08:30') === 510);
check('510 min son 08:30', sandbox.minutosAHora_(510) === '08:30');
check('una hora vacía cae en el default',
  sandbox.horaAMinutos_('') === 510);
check('no se pasa de las 24 h',
  sandbox.minutosAHora_(25 * 60) === '01:00',
  sandbox.minutosAHora_(25 * 60));
check('320 min se leen 5 h 20 min',
  sandbox.duracionLegible_(320) === '5 h 20 min',
  sandbox.duracionLegible_(320));
check('45 min sin horas', sandbox.duracionLegible_(45) === '45 min');
check('180 min son 3 h', sandbox.duracionLegible_(180) === '3 h');

console.log('\n12. guardarRuta valida antes de escribir');

function rutaFalla(payload) {
  try { sandbox.guardarRuta(payload); return ''; }
  catch (e) { return e.message; }
}

check('rechaza sin nombre',
  rutaFalla({ paradas: ['MAP-0001'] }).indexOf('nombre') !== -1);
check('rechaza sin paradas',
  rutaFalla({ nombre: 'Ruta 1', paradas: [] })
    .indexOf('al menos un aserradero') !== -1);
check('rechaza una fecha mal escrita',
  rutaFalla({ nombre: 'Ruta 1', paradas: ['MAP-0001'], fecha: '20/08/2026' })
    .indexOf('fecha no es válida') !== -1);
check('rechaza una hora mal escrita',
  rutaFalla({ nombre: 'Ruta 1', paradas: ['MAP-0001'], hora: '8am' })
    .indexOf('hora de inicio no es válida') !== -1);
check('una ruta válida supera la validación',
  rutaFalla({
    nombre: 'Ruta 1', paradas: ['MAP-0001'],
    fecha: '2026-08-20', hora: '08:30'
  }).indexOf('válida') === -1);

// Cabrero → Coihueco: 0,41° de latitud y 0,57° de longitud, o sea
// unos 68 km en línea recta.
check('haversine: Cabrero a Coihueco ronda los 68 km',
  Math.round(sandbox.haversineKm_(BIOCHIPER, GEOMAR)) >= 65 &&
  Math.round(sandbox.haversineKm_(BIOCHIPER, GEOMAR)) <= 72,
  String(Math.round(sandbox.haversineKm_(BIOCHIPER, GEOMAR))));

check('haversine de un punto consigo mismo es 0',
  sandbox.haversineKm_(BIOCHIPER, BIOCHIPER) < 0.001);

console.log(
  '\n' + (fallos ? fallos + ' comprobaciones fallaron' : 'Todo OK')
);

process.exit(fallos ? 1 : 0);
