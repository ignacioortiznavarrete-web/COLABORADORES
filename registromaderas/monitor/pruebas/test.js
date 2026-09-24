/**
 * Pruebas del monitor. Se apoyan en el mismo simulador de Apps Script que el
 * formulario de entrada: son proyectos distintos pero el mismo spreadsheet.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { SS } = require('../../pruebas/mock');

const FUENTES = ['Config.gs', 'Monitor.gs']
  .map(f => path.join(__dirname, '..', 'fuente', f));
console.log('Probando: ' + FUENTES.map(f => path.basename(f)).join(', '));
FUENTES.forEach(f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: path.basename(f) }));

let fallos = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + msg);
  if (!cond) fallos++;
}
function seccion(t) { console.log('\n' + t); }
function error(fn) {
  try { fn(); } catch (err) { return err.message; }
  return '';
}

/* ------------------------------------------- las bitácoras, como quedan hoy */

const REG = ['N° Solicitud', 'Fecha', 'Usuario', 'Tipo Solicitud', 'Estado',
  'Fecha de creación', 'SKU', 'Observación', 'Observación codificación'];
const DET = ['N° Solicitud', 'Fecha', 'Solicitante', 'Clase Requerimiento',
  'País', 'Tipo Requerimiento', 'Origen', 'Centro', 'Tipo Material',
  'Agrupación', 'Descripción Agrupación', 'Código', 'Descripción Material',
  'Grupo Artículo', 'Espesor', 'Ancho', 'Largo', 'Piezas', 'UMB', 'Stock/Pedido',
  'Aserradero', 'Secado', 'Cepillado', 'Hoja Destino', 'Fila Destino'];

function escribir(nombre, encabezados, filas) {
  const hoja = SS.insertSheet(nombre);
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  filas.forEach((f, i) => {
    const completa = encabezados.map(h => (h in f ? f[h] : ''));
    hoja.getRange(2 + i, 1, 1, encabezados.length).setValues([completa]);
  });
  return hoja;
}

function unCodigo(numero, codigo, extra) {
  return Object.assign({
    'N° Solicitud': numero, 'Fecha': '24.09.2026', 'Solicitante': 'barbara@masisa.com',
    'Clase Requerimiento': 'PT', 'País': 'CL', 'Código': codigo,
    'Descripción Material': 'Rús. Verde Médula ' + codigo,
    'Espesor': '032', 'Ancho': '180', 'Largo': '3800', 'UMB': 'PZA',
    'Aserradero': 'RVM 032X180', 'Hoja Destino': 'PT', 'Fila Destino': 3
  }, extra || {});
}

escribir('Registro', REG, [
  { 'N° Solicitud': 'SOL-00001', 'Fecha': '24.09.2026', 'Usuario': 'barbara@masisa.com',
    'Tipo Solicitud': 'PT', 'Estado': 'Solicitando',
    'SKU': 'RVMH032X180X3800, RVMH032X180X3850, RVMH032X180X3900',
    'Observación': 'Urgente para Osorno' },
  { 'N° Solicitud': 'SOL-00002', 'Fecha': '24.09.2026', 'Usuario': 'jorge@masisa.com',
    'Tipo Solicitud': 'PP', 'Estado': 'Finalizado', 'Fecha de creación': '25.09.2026',
    'SKU': 'RVM 032X180', 'Observación codificación': 'Creado en SAP' },
  // Una vieja, sin detalle guardado: solo tiene su columna SKU.
  { 'N° Solicitud': 'SOL-00003', 'Fecha': '20.09.2026', 'Usuario': 'ana@masisa.com',
    'Tipo Solicitud': 'PE', 'Estado': '', 'SKU': 'RSFR037X130X3200; RSFR037X130X3600' }
]);

escribir('Registro Detalle', DET, [
  unCodigo('SOL-00001', 'RVMH032X180X3800', { 'Fila Destino': 3, 'Piezas': 248 }),
  unCodigo('SOL-00001', 'RVMH032X180X3850', { 'Fila Destino': 4 }),
  unCodigo('SOL-00001', 'RVMH032X180X3900', { 'Fila Destino': 5 }),
  unCodigo('SOL-00002', 'RVM 032X180',
    { 'Clase Requerimiento': 'PP', 'UMB': 'M3', 'Largo': '', 'Hoja Destino': 'PP', 'Fila Destino': 3 })
]);

/* ------------------------------------------------------------- las pruebas */

seccion('Leer una hoja por sus rótulos');
{
  const h = leerHoja_('Registro');
  ok(h.filas.length === 3, 'trae las tres solicitudes y no la fila de rótulos');
  ok(h.filas[0]['N° Solicitud'] === 'SOL-00001', 'cada fila se lee por el nombre de su columna');
  ok(h.filas[0].fila === 2, 'y dice en qué fila del spreadsheet está');
  ok(leerHoja_('No existe').falta === 'No existe', 'una hoja que no está se avisa, no revienta');
}

seccion('Las solicitudes, con sus códigos adentro');
{
  const r = apiSolicitudes();
  ok(r.ok, 'responde');
  ok(r.total === 3, 'cuenta las tres');

  // De la más nueva hacia atrás: lo recién pedido es lo que se mira.
  ok(r.solicitudes[0].numero === 'SOL-00003', 'la más nueva va primero');
  ok(r.solicitudes[2].numero === 'SOL-00001', 'y la más vieja al final');

  const uno = r.solicitudes.filter(s => s.numero === 'SOL-00001')[0];
  ok(uno.usuario === 'barbara@masisa.com' && uno.tipo === 'PT' && uno.estado === 'Solicitando',
    'la cabecera trae lo que Registro guarda');
  ok(uno.observacion === 'Urgente para Osorno', 'con su observación');
  ok(uno.fechaCreacion === '', 'y la fecha de creación vacía mientras no la llenen');

  // Lo que se preguntó: en el monitor van los CÓDIGOS, no los números de fila.
  ok(uno.cuantos === 3, 'la solicitud junta sus tres códigos');
  ok(uno.codigos.map(c => c['Código']).join() ===
     'RVMH032X180X3800,RVMH032X180X3850,RVMH032X180X3900',
    'y son los códigos del batch input, no las filas donde quedaron');
  ok(uno.codigos[0]['Fila Destino'] === '3' && uno.deDetalle,
    'la fila del batch input está, pero como un dato más del código');

  ok(r.estados.join(' > ') ===
     'Solicitando > Validando información > Pendiente > Creando > Finalizado',
    'y llegan los estados por los que pasa, en orden');

  const dos = r.solicitudes.filter(s => s.numero === 'SOL-00002')[0];
  ok(dos.cuantos === 1 && dos.codigos[0]['UMB'] === 'M3',
    'una de proceso trae su código con su unidad');
  ok(dos.observacionCodificacion === 'Creado en SAP', 'y lo que escribió codificación');
}

seccion('Una solicitud sin detalle se apaña con su SKU');
{
  const vieja = apiSolicitudes().solicitudes.filter(s => s.numero === 'SOL-00003')[0];
  ok(!vieja.deDetalle, 'se nota que no viene del detalle');
  ok(vieja.cuantos === 2, 'igual muestra sus dos códigos');
  ok(vieja.codigos.map(c => c['Código']).join() === 'RSFR037X130X3200,RSFR037X130X3600',
    'partiendo la columna SKU por sus separadores');
}

// Nadie edita nada desde el monitor, ni el estado: se reparte a quien deba
// mirar, y ninguno de ellos deberia poder cambiar una solicitud.
seccion('El monitor no escribe nada');
{
  const filas = SS.getSheetByName('Registro').getLastRow();
  const detalle = SS.getSheetByName('Registro Detalle').getLastRow();
  const antes = apiSolicitudes().solicitudes.map(s => s.numero + ':' + s.estado).join(' ');

  apiSolicitudes();
  apiSolicitudes();

  ok(SS.getSheetByName('Registro').getLastRow() === filas, 'no agrega ni quita solicitudes');
  ok(SS.getSheetByName('Registro Detalle').getLastRow() === detalle, 'ni toca el detalle');
  ok(apiSolicitudes().solicitudes.map(s => s.numero + ':' + s.estado).join(' ') === antes,
    'y los estados quedan como estaban');

  const fuente = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Monitor.gs'), 'utf8');
  ok(fuente.indexOf('setValue') === -1, 'no tiene con qué: ningún setValue');
  ok(fuente.indexOf('appendRow') === -1, 'ni appendRow');
  ok(typeof apiCambiarEstado === 'undefined', 'ni una función para cambiar el estado');

  const permisos = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'fuente', 'appsscript.json'), 'utf8')).oauthScopes;
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets.readonly') !== -1,
    'y pide permiso de solo lectura');
  ok(permisos.indexOf('https://www.googleapis.com/auth/spreadsheets') === -1,
    'no de escritura');

  const index = fs.readFileSync(path.join(__dirname, '..', 'fuente', 'Index.html'), 'utf8');
  ok(index.indexOf('<select class="estado') === -1 && index.indexOf('pastilla') !== -1,
    'la pantalla muestra el estado, no lo ofrece para cambiar');
}

console.log('\n' + (fallos ? fallos + ' prueba(s) con problemas' : 'Todas las pruebas pasaron'));
process.exit(fallos ? 1 : 0);
