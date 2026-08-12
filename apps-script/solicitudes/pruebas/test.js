const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('./mock');

const DIR = path.join(__dirname, '..');

// Con ARCHIVO_UNICO=1 se prueba el archivo generado (todo-en-uno/Codigo.gs)
// en vez de los fuentes, para confirmar que ambos se comportan igual.
const FUENTES = process.env.ARCHIVO_UNICO === '1'
  ? [path.join('todo-en-uno', 'Codigo.gs')]
  : ['Config.gs', 'Setup.gs', 'Solicitudes.gs'];

console.log('Probando: ' + FUENTES.join(', '));
FUENTES.forEach(f => {
  vm.runInThisContext(fs.readFileSync(path.join(DIR, f), 'utf8'), { filename: f });
});

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }

// Reproduce las hojas tal como están hoy en el spreadsheet (solo encabezados,
// incluida la columna vacía que tiene Costos entre "Material" y el estado).
function crearHojasReales() {
  SS.insertSheet('Costos').getRange(1, 1, 1, 8).setValues([[
    'numero de solicitud', 'Tipo de solicitud', 'solicitante', 'Material', '',
    'estado de la solicitud', 'Respuestas', 'consultas'
  ]]);
  SS.insertSheet('T&D').getRange(1, 1, 1, 9).setValues([[
    'numero de solicitud', 'estado', 'pregunta1', 'pregunta2', 'pregunta3',
    'respuesta1', 'respuesta2', 'respuesta3', 'Consultas'
  ]]);
  SS.insertSheet('Produccion').getRange(1, 1, 1, 4).setValues([[
    'numero de solicitud', 'estado', 'pregunta1', 'Respuesta'
  ]]);
}

function celda(hoja, numero, columna) {
  const sh = SS.getSheetByName(hoja);
  const enc = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const cNum = enc.findIndex(h => clave_(h) === clave_('numero de solicitud')) + 1;
  const cCol = enc.findIndex(h => clave_(h) === clave_(columna)) + 1;
  const filas = sh.getLastRow();
  for (let r = 2; r <= filas; r++) {
    if (String(sh.getRange(r, cNum).getValue()).trim() === numero) {
      const v = sh.getRange(r, cCol).getValue();
      return v == null ? '' : String(v);
    }
  }
  return null;
}

function filasCon(hoja, numero) {
  const sh = SS.getSheetByName(hoja);
  let n = 0;
  for (let r = 2; r <= sh.getLastRow(); r++) {
    if (String(sh.getRange(r, 1).getValue()).trim() === numero) n++;
  }
  return n;
}

function datosCostos(extra) {
  return Object.assign({
    tipoSolicitud: 'Tablero', solicitante: 'Juan Pérez', material: 'MDF 18mm',
    consultas: '¿Stock disponible?', respuestas: ''
  }, extra || {});
}

crearHojasReales();

seccion('Instalación');
instalarSolicitudes();
ok(!!SS.getSheetByName('Historial'), 'crea la hoja Historial');
const encCostos = SS.getSheetByName('Costos').getRange(1, 1, 1, 20).getValues()[0].filter(String);
ok(encCostos[0] === 'numero de solicitud' && encCostos[3] === 'Material',
   'conserva las columnas originales de Costos en su orden');
ok(encCostos.indexOf('Devuelto Por') > 7 && encCostos.indexOf('Versión') > 7,
   'agrega las columnas de control al final');

seccion('Camino feliz: Costos → T&D → Producción');
let r = apiGuardar({ etapaId: 'costos', datos: datosCostos(), estado: 'Aprobado', comentario: '' });
const N1 = r.numero;
ok(/^SOL-\d{5}$/.test(N1), 'genera número correlativo ' + N1);
ok(celda('Costos', N1, 'estado de la solicitud') === 'Aprobado', 'Costos queda Aprobado');
ok(filasCon('T&D', N1) === 1, 'crea la fila en T&D con el número');
ok(celda('T&D', N1, 'pregunta1') === '', 'a T&D solo viaja el número, sin datos de Costos');
ok(celda('Produccion', N1, 'numero de solicitud') === null, 'Producción todavía no recibe nada');

ok(apiBandeja('td').some(s => s.numero === N1), 'la solicitud aparece en la bandeja de T&D');
ok(!apiBandeja('costos').some(s => s.numero === N1), 'ya no aparece en la bandeja de Costos');

try {
  apiGuardar({ etapaId: 'produccion', numero: N1, datos: { pregunta1: 'x', respuesta: 'y' }, estado: 'Aprobado' });
  ok(false, 'Producción NO puede saltarse T&D');
} catch (e) {
  ok(/está en T&D/.test(e.message), 'Producción no puede saltarse T&D (' + e.message + ')');
}

apiGuardar({
  etapaId: 'td', numero: N1,
  datos: { pregunta1: '¿Fecha de despacho?', respuesta1: '12-08', pregunta2: '', respuesta2: '', pregunta3: '', respuesta3: '', consultas: '' },
  estado: 'Aprobado', comentario: ''
});
ok(celda('T&D', N1, 'estado') === 'Aprobado', 'T&D queda Aprobado');
ok(filasCon('Produccion', N1) === 1, 'crea la fila en Producción');

r = apiGuardar({ etapaId: 'produccion', numero: N1, datos: { pregunta1: '¿Línea asignada?', respuesta: 'Línea 3' }, estado: 'Aprobado' });
ok(/finalizado/i.test(r.mensaje), 'Producción cierra el flujo: ' + r.mensaje);
ok(apiObtener('produccion', N1).flujo.resultado === 'Finalizada', 'la solicitud queda Finalizada');

seccion('Rechazo: corta el flujo');
const N2 = apiGuardar({ etapaId: 'costos', datos: datosCostos({ solicitante: 'Ana' }), estado: 'Rechazado', comentario: 'Fuera de presupuesto' }).numero;
ok(N2 !== N1, 'número distinto al anterior: ' + N2);
ok(celda('Costos', N2, 'estado de la solicitud') === 'Rechazado', 'Costos queda Rechazado');
ok(filasCon('T&D', N2) === 0, 'NO avanza a T&D');
ok(apiObtener('costos', N2).flujo.cerrada === true, 'la solicitud queda cerrada');
try {
  apiGuardar({ etapaId: 'costos', numero: N2, datos: datosCostos(), estado: 'Aprobado' });
  ok(false, 'no se puede reabrir una solicitud rechazada');
} catch (e) { ok(/cerrada/.test(e.message), 'no se puede reabrir una rechazada'); }

seccion('Modificado desde T&D: vuelve a Costos y resetea estados');
const N3 = apiGuardar({ etapaId: 'costos', datos: datosCostos({ solicitante: 'Luis', material: 'Melamina 15mm' }), estado: 'Aprobado' }).numero;
apiGuardar({
  etapaId: 'td', numero: N3,
  datos: { pregunta1: '¿Espesor correcto?', respuesta1: 'Falta confirmar', pregunta2: '', respuesta2: '', pregunta3: '', respuesta3: '', consultas: 'Revisar con Costos' },
  estado: 'Modificado', comentario: 'El material no calza con el pedido'
});
ok(celda('Costos', N3, 'estado de la solicitud') === '', 'resetea el estado de Costos');
ok(celda('T&D', N3, 'estado') === '', 'resetea el estado de T&D');
ok(celda('Costos', N3, 'Devuelto Por') === 'T&D', 'marca en Costos quién la devolvió');
ok(celda('Costos', N3, 'Motivo Devolución') === 'El material no calza con el pedido', 'guarda el motivo');

const ficha = apiObtener('costos', N3);
ok(ficha.flujo.etapaActual === 'costos', 'la etapa actual vuelve a Costos');
ok(ficha.flujo.devueltoPorTitulo === 'T&D', 'la ficha indica que volvió desde T&D');
ok(ficha.flujo.version === 2, 'sube a versión 2');
const fCostos = ficha.avance.find(a => a.etapaId === 'costos');
ok(fCostos.datos.solicitante === 'Luis' && fCostos.datos.material === 'Melamina 15mm',
   'Costos se reabre con TODOS los campos cargados');
const fTd = ficha.avance.find(a => a.etapaId === 'td');
ok(fTd.existe && fTd.datos.respuesta1 === 'Falta confirmar',
   '"Ver más" conserva lo registrado en T&D');
ok(ficha.puedeEditar === true, 'Costos puede volver a editarla');
ok(apiBandeja('costos').some(s => s.numero === N3 && s.devueltoPor === 'td'),
   'aparece en la bandeja de Costos como devuelta');
ok(!apiBandeja('td').some(s => s.numero === N3), 'sale de la bandeja de T&D');

seccion('Reenvío tras la modificación');
apiGuardar({ etapaId: 'costos', numero: N3, datos: datosCostos({ solicitante: 'Luis', material: 'Melamina 18mm' }), estado: 'Aprobado' });
ok(celda('Costos', N3, 'Devuelto Por') === '', 'limpia la marca de devolución');
ok(celda('Costos', N3, 'Material') === 'Melamina 18mm', 'guarda el material corregido');
ok(filasCon('T&D', N3) === 1, 'no duplica la fila en T&D');
const fichaTd = apiObtener('td', N3);
ok(fichaTd.avance.find(a => a.etapaId === 'td').datos.respuesta1 === 'Falta confirmar',
   'T&D recupera lo que ya había escrito');
ok(fichaTd.puedeEditar === true, 'T&D la puede atender de nuevo');

seccion('Modificado desde Producción: también vuelve a Costos');
apiGuardar({
  etapaId: 'td', numero: N3,
  datos: { pregunta1: 'ok', respuesta1: 'ok', pregunta2: '', respuesta2: '', pregunta3: '', respuesta3: '', consultas: '' },
  estado: 'Aprobado'
});
apiGuardar({ etapaId: 'produccion', numero: N3, datos: { pregunta1: '¿Se puede producir?', respuesta: 'No con ese espesor' }, estado: 'Modificado', comentario: 'Cambiar espesor' });
const f3 = apiObtener('costos', N3);
ok(f3.flujo.etapaActual === 'costos', 'vuelve a Costos desde Producción');
ok(f3.flujo.estados.costos === '' && f3.flujo.estados.td === '' && f3.flujo.estados.produccion === '',
   'resetea los estados de las 3 hojas');
ok(f3.flujo.version === 3, 'versión 3');
ok(f3.avance.filter(a => a.existe).length === 3, '"Ver más" muestra las 3 hojas');

seccion('Validaciones');
try {
  apiGuardar({ etapaId: 'costos', datos: datosCostos(), estado: 'Pendiente' });
  ok(false, 'rechaza estados fuera de la lista');
} catch (e) { ok(/Debes seleccionar un estado/.test(e.message), 'rechaza estados fuera de la lista'); }
try {
  apiGuardar({ etapaId: 'costos', datos: datosCostos({ material: '' }), estado: 'Aprobado' });
  ok(false, 'exige campos obligatorios');
} catch (e) { ok(/obligatorios: Material/.test(e.message), 'exige campos obligatorios'); }
try {
  apiGuardar({ etapaId: 'costos', datos: datosCostos(), estado: 'Rechazado', comentario: '' });
  ok(false, 'exige motivo al rechazar');
} catch (e) { ok(/Indica el motivo/.test(e.message), 'exige motivo al rechazar/devolver'); }
try {
  apiGuardar({ etapaId: 'td', datos: {}, estado: 'Aprobado' });
  ok(false, 'T&D no puede crear solicitudes');
} catch (e) { ok(/solicitud existente|obligatorios/.test(e.message), 'T&D no puede crear solicitudes nuevas'); }

seccion('Unicidad del número');
const numeros = new Set();
for (let i = 0; i < 5; i++) {
  numeros.add(apiGuardar({ etapaId: 'costos', datos: datosCostos(), estado: 'Aprobado' }).numero);
}
ok(numeros.size === 5, '5 solicitudes seguidas → 5 números únicos');

seccion('Historial');
const hist = apiObtener('costos', N3).historial;
ok(hist.length >= 5, 'registra cada movimiento (' + hist.length + ' eventos)');
ok(hist.some(e => e.estado === 'Modificado' && e.etapa === 'T&D'), 'deja huella del Modificado de T&D');

console.log('\n' + (fallos ? '✗ ' + fallos + ' fallo(s)' : '✓ Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
