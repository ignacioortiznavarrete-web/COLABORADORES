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
  '  ESTADO_INICIAL, ESTADO_CERRADO, MAPEOS_HEADERS, LIMITES_CL' +
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

console.log(
  '\n' + (fallos ? fallos + ' comprobaciones fallaron' : 'Todo OK')
);

process.exit(fallos ? 1 : 0);
