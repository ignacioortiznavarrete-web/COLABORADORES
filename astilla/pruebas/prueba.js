/**
 * Comprobación de los tres arreglos, con las globales de Apps Script
 * simuladas. No toca Gmail ni el spreadsheet.
 */
const fs = require('fs');
const vm = require('vm');

const path = require('path');

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
      if (fmt === 'yyyy-MM') return y + '-' + m;
      return y + '-' + m + '-' + d;
    },
    getUuid: function() { return 'uuid'; }
  }
};

vm.createContext(sandbox);
vm.runInContext(codigo, sandbox);

let fallos = 0;

function check(nombre, condicion, detalle) {
  if (condicion) {
    console.log('  ok   ' + nombre);
  } else {
    fallos++;
    console.log('  FALLA ' + nombre + (detalle ? ' → ' + detalle : ''));
  }
}

/* 1. Planilla leída pero sin fecha → tiene que lanzar error ---------- */
console.log('\n1. Fecha faltante');

const filas = [{
  subproducto: 'ASTILLA PINO VERDE',
  subproductoRaw: 'ASTILLA PINO VERDE',
  proveedor: 'PROMASA S.A.',
  destino: 'TABLEROS',
  camiones: 6
}];

let lanzo = false;
let mensaje = '';

try {
  sandbox.buildParsedReport_('', filas, 'Tabla HTML del correo');
} catch (e) {
  lanzo = true;
  mensaje = e.message;
}

check('lanza error si no hay fecha', lanzo);
check(
  'el mensaje dice cuántas filas se leyeron',
  mensaje.indexOf('1 filas') !== -1,
  mensaje
);

const ok = sandbox.buildParsedReport_(
  '2026-08-14',
  filas,
  'Tabla HTML del correo'
);

check('con fecha válida devuelve el informe', ok.fecha === '2026-08-14');

/* 2. Asunto tolerante ------------------------------------------------ */
console.log('\n2. Variantes del asunto');

[
  'PLANILLA CUMPLIMIENTO SUB-PRODUCTOS 14-08-2026',
  'PLANILLA CUMPLIMIENTO SUB PRODUCTOS 14-08-2026',
  'Planilla cumplimiento subproductos 14/08/2026',
  'RE: CUMPLIMIENTO SUBPRODUCTOS'
].forEach(function(asunto) {
  check('acepta "' + asunto + '"', sandbox.matchesSubject_(asunto));
});

check(
  'rechaza un asunto ajeno',
  !sandbox.matchesSubject_('INGRESOS METROS RUMA 14-08-2026')
);

/* 3. Feriados en el prorrateo ---------------------------------------- */
console.log('\n3. Feriados de septiembre 2026');

const septiembre = {
  prefix: '2026-09',
  year: 2026,
  month: 9,
  startKey: '2026-09-01',
  endKey: '2026-09-30',
  label: 'septiembre de 2026'
};

const wd = sandbox.buildWorkdaysInfo_(
  'America/Santiago',
  septiembre,
  '2026-09-30',
  ''
);

// Septiembre 2026 tiene 22 días de lunes a viernes; el 18, 19 y 21
// son feriados y el 19 cae sábado, así que se descuentan 18 y 21.
check(
  'días hábiles de septiembre = 20',
  wd.total === 20,
  'total=' + wd.total
);

check(
  'el 18-09 no está en la lista de días hábiles',
  wd.workdayKeys.indexOf('2026-09-18') === -1
);

check(
  'el 21-09 no está en la lista de días hábiles',
  wd.workdayKeys.indexOf('2026-09-21') === -1
);

check(
  'el 17-09 sí es día hábil',
  wd.workdayKeys.indexOf('2026-09-17') !== -1
);

/* 4. supplementStart sin datos de SAP -------------------------------- */
console.log('\n4. Inicio del complemento');

const planilla = [
  { fecha: '2026-08-10', camiones: 4 },
  { fecha: '2026-08-11', camiones: 6 },
  { fecha: '2026-08-12', camiones: 5 }
];

const sinSap = sandbox.buildSupplementRows_([], planilla);

check(
  'sin SAP arranca en la planilla más antigua',
  sinSap.supplementStart === '2026-08-10',
  sinSap.supplementStart
);

const conSap = sandbox.buildSupplementRows_(
  [{ fecha: '2026-08-10' }],
  planilla
);

check(
  'con SAP hasta el 10 arranca el 11',
  conSap.supplementStart === '2026-08-11',
  conSap.supplementStart
);

check(
  'descarta el día ya cerrado en SAP',
  conSap.rows.length === 2 && conSap.staleReports === 1,
  'filas=' + conSap.rows.length + ' stale=' + conSap.staleReports
);

check(
  'suma los camiones complementados',
  conSap.camiones === 11,
  String(conSap.camiones)
);

/* 5. Clasificación de sub-productos ---------------------------------- */
console.log('\n5. canonicalSubproducto_');

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
  check(
    '"' + par[0] + '" → ' + (par[1] || '(ignorado)'),
    salida === par[1],
    'devolvió "' + salida + '"'
  );
});

console.log(
  '\n' + (fallos ? fallos + ' comprobaciones fallaron' : 'Todo OK')
);

process.exit(fallos ? 1 : 0);
